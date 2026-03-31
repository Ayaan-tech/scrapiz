import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { addDays, format, setHours, setMinutes, startOfToday } from 'date-fns';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { Picker } from '@react-native-picker/picker';
import Toast from 'react-native-toast-message';
import { ArrowLeft, Building, Check, ChevronDown, FileText, Home, MapPin, Plus } from 'lucide-react-native';
import { AddressSummary, AuthService, ServiceBookingPayload } from '../../api/apiService';
import { useTheme } from '../../context/ThemeContext';
import { useLocation } from '../../context/LocationContext';
import MapLocationPicker from '../../components/MapLocationPicker';
import { LocationResult } from '../../utils/addressHelpers';

type Step = 1 | 2 | 3;
type VehicleType = 'two_wheeler' | 'four_wheeler' | 'commercial' | 'farm_heavy';
type UploadFile = { uri: string; name: string; mimeType?: string };

const VEHICLES = [
  { id: 'two_wheeler' as const, title: 'Two - wheeler', subtitle: 'Bike / Scooter', image: require('../../../assets/images/services/vehicle_scrapping/twoWheeler.webp') },
  { id: 'four_wheeler' as const, title: 'Four - wheeler', subtitle: 'Car / SUV / MUV', image: require('../../../assets/images/services/vehicle_scrapping/fourWheeler.webp') },
  { id: 'commercial' as const, title: 'Commercial', subtitle: 'Truck / Tempo / Bus', image: require('../../../assets/images/services/vehicle_scrapping/commercia.webp') },
  { id: 'farm_heavy' as const, title: 'Farm / Heavy', subtitle: 'Tractor / Machinery', image: require('../../../assets/images/services/vehicle_scrapping/farmheavy.webp') },
];
const BRANDS = ['Maruti Suzuki', 'Hyundai', 'Tata', 'Mahindra', 'Honda', 'Toyota', 'Ford', 'Volkswagen', 'Skoda', 'Renault', 'Kia', 'MG', 'BMW', 'Mercedes-Benz', 'Audi', 'Jeep', 'TVS', 'Hero', 'Bajaj', 'Royal Enfield', 'Yamaha', 'Suzuki', 'Ashok Leyland', 'Eicher', 'Force', 'John Deere', 'Kubota', 'Sonalika'];
const MODELS_BY_BRAND: Record<string, string[]> = {
  'Maruti Suzuki': ['Alto 800', 'Swift', 'Dzire', 'WagonR', 'Baleno'],
  Hyundai: ['Santro', 'i10', 'i20', 'Creta'],
  Tata: ['Nano', 'Tiago', 'Punch', 'Nexon', 'Ace'],
  Mahindra: ['Bolero', 'Scorpio', 'Pickup', 'Tractor'],
  Honda: ['Activa', 'Shine', 'City', 'Amaze'],
};
const YEARS = Array.from({ length: 2026 - 1980 + 1 }, (_, index) => String(1980 + index));
const FUEL_TYPES = ['Petrol', 'Diesel', 'CNG', 'Electric'];
const CONDITIONS = ['Running', 'Damaged', 'Flood-hit', 'Accidental'];
const TIME_SLOTS = ['09:00 AM', '11:00 AM', '01:00 PM', '03:00 PM', '05:00 PM', '07:00 PM'];
const BOOKING_DATES = Array.from({ length: 14 }, (_, index) => addDays(startOfToday(), index));

const getSlotHour = (slot: string) => {
  const match = slot.match(/(\d+):(\d+) (AM|PM)/);
  if (!match) return 0;
  let hour = parseInt(match[1], 10);
  if (match[3] === 'PM' && hour < 12) hour += 12;
  if (match[3] === 'AM' && hour === 12) hour = 0;
  return hour;
};
const getCurrentISTHour = () => {
  const now = new Date();
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utcMs + 5.5 * 3600000).getHours();
};
const validatePhone = (value: string) => /^(\+?\d{6,15})$/.test(value.trim());

export default function DismantlingBookScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();
  const { reloadAddresses } = useLocation();

  const ui = useMemo(() => ({
    bg: isDark ? '#0F131A' : '#FFFFFF',
    surface: isDark ? '#171C24' : '#FFFFFF',
    border: isDark ? '#323843' : '#D8D8D8',
    faintBorder: isDark ? '#454C58' : '#E6E6E6',
    title: isDark ? '#F7F8FA' : '#111111',
    text: isDark ? '#ECEFF3' : '#191919',
    muted: isDark ? '#A7AFBC' : '#7A7A7A',
    red: '#C72222',
    redSoft: isDark ? 'rgba(199,34,34,0.2)' : '#FFF1F1',
    yellowBg: isDark ? '#302500' : '#FFF8D8',
    yellowBorder: isDark ? '#E4A400' : '#F0A000',
    yellowText: isDark ? '#FFD36F' : '#F08A00',
    line: isDark ? '#505764' : '#D8D8D8',
  }), [isDark]);

  const [step, setStep] = useState<Step>(1);
  const [vehicleType, setVehicleType] = useState<VehicleType | null>(null);
  const [drivable, setDrivable] = useState(false);
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [brand, setBrand] = useState('Maruti Suzuki');
  const [model, setModel] = useState('Alto 800');
  const [year, setYear] = useState('2008');
  const [fuelType, setFuelType] = useState('Petrol');
  const [condition, setCondition] = useState('Damaged');
  const [vehiclePhotos, setVehiclePhotos] = useState<UploadFile[]>([]);
  const [rcBook, setRcBook] = useState<UploadFile | null>(null);
  const [idProof, setIdProof] = useState<UploadFile | null>(null);
  const [insuranceCopy, setInsuranceCopy] = useState<UploadFile | null>(null);
  const [nocDocument, setNocDocument] = useState<UploadFile | null>(null);
  const [previewFile, setPreviewFile] = useState<UploadFile | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [addresses, setAddresses] = useState<AddressSummary[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<AddressSummary | null>(null);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(BOOKING_DATES[0]);
  const [selectedTime, setSelectedTime] = useState<string | null>('09:00 AM');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const currentModels = MODELS_BY_BRAND[brand] || ['Other'];
  const nonDrivable = !drivable;
  const selectedAddressText = selectedAddress ? [selectedAddress.room_number, selectedAddress.street, selectedAddress.area, selectedAddress.city, selectedAddress.state, selectedAddress.pincode].filter(Boolean).join(', ') : '';

  useEffect(() => {
    if (!currentModels.includes(model)) setModel(currentModels[0]);
  }, [brand, model, currentModels]);

  useEffect(() => {
    (async () => {
      try {
        const [user, addressList] = await Promise.all([AuthService.getUser(), AuthService.getAddresses()]);
        setName(user.name || '');
        setPhone(user.phone_number || '');
        setAddresses(addressList);
        if (addressList.length > 0) setSelectedAddress(addressList[0]);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const availableTimeSlots = useMemo(() => {
    if (!selectedDate) return TIME_SLOTS;
    if (selectedDate.toDateString() !== startOfToday().toDateString()) return TIME_SLOTS;
    return TIME_SLOTS.filter((slot) => getSlotHour(slot) > getCurrentISTHour());
  }, [selectedDate]);

  useEffect(() => {
    if (selectedTime && !availableTimeSlots.includes(selectedTime)) setSelectedTime(availableTimeSlots[0] || null);
  }, [availableTimeSlots, selectedTime]);

  const pickPhotos = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ allowsMultipleSelection: true, mediaTypes: ImagePicker.MediaTypeOptions.Images, selectionLimit: Math.max(0, 6 - vehiclePhotos.length), quality: 0.8 });
    if (!result.canceled) {
      setVehiclePhotos((current) => [...current, ...result.assets.map((asset, index) => ({ uri: asset.uri, name: asset.fileName || `vehicle-${Date.now()}-${index + 1}.jpg`, mimeType: asset.mimeType }))]);
    }
  };

  const pickDocument = async (setter: React.Dispatch<React.SetStateAction<UploadFile | null>>, label: string) => {
    const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true, multiple: false, type: ['image/*', 'application/pdf'] });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setter({ uri: asset.uri, name: asset.name, mimeType: asset.mimeType });
      Toast.show({ type: 'success', text1: `${label} uploaded`, text2: asset.name });
    }
  };

  const saveMapLocation = async (location: LocationResult) => {
    try {
      const created = await AuthService.createAddress({ name: 'Pickup Address', phone_number: phone || '', room_number: '', street: location.address.split(',')[0] || '', area: location.area, city: location.city, state: location.state, country: 'India', pincode: parseInt(location.pincode, 10) || 0, delivery_suggestion: '' } as any);
      setAddresses((current) => [...current, created]);
      setSelectedAddress(created);
      setShowMapPicker(false);
      reloadAddresses();
    } catch (error: any) {
      Alert.alert('Address Error', error.message || 'Unable to save pickup address');
    }
  };

  const buildPreferredDateTime = () => {
    if (!selectedDate || !selectedTime) throw new Error('Select preferred pickup date and time');
    const match = selectedTime.match(/(\d+):(\d+) (AM|PM)/);
    if (!match) throw new Error('Invalid selected time');
    let hour = parseInt(match[1], 10);
    const minute = parseInt(match[2], 10);
    if (match[3] === 'PM' && hour < 12) hour += 12;
    if (match[3] === 'AM' && hour === 12) hour = 0;
    return setMinutes(setHours(new Date(selectedDate), hour), minute).toISOString();
  };

  const canContinueStep1 = !!vehicleType;
  const canContinueStep2 = registrationNumber.trim().length > 0 && brand.length > 0 && model.length > 0 && year.length > 0 && fuelType.length > 0 && condition.length > 0 && vehiclePhotos.length >= 3 && !!rcBook && !!idProof;
  const canSubmit = !!selectedDate && !!selectedTime && !!selectedAddress && !!name.trim() && validatePhone(phone);

  const submitBooking = async () => {
    try {
      setSubmitting(true);
      const payload: ServiceBookingPayload = {
        service: 'dismantling',
        name: name.trim(),
        phone: phone.trim(),
        address: selectedAddressText,
        preferredDateTime: buildPreferredDateTime(),
        service_details: {
          service_type: 'vehicle_scrapping',
          vehicle_type: vehicleType,
          is_drivable: drivable,
          registration_number: registrationNumber.trim(),
          brand,
          model,
          manufacture_year: year,
          fuel_type: fuelType,
          vehicle_condition: condition,
          towing_required: nonDrivable,
          photo_count: vehiclePhotos.length,
          uploaded_photos: vehiclePhotos.map((item) => item.name),
          rc_book: rcBook?.name,
          id_proof: idProof?.name,
          insurance_copy: insuranceCopy?.name,
          noc_document: nocDocument?.name,
          noc_required: nonDrivable,
        },
      };
      await AuthService.createServiceBooking(payload);
      setSuccess(true);
      setTimeout(() => router.replace('/(tabs)/services'), 2200);
    } catch (error: any) {
      Alert.alert('Submission Failed', error.message || 'Unable to submit vehicle scrapping enquiry');
    } finally {
      setSubmitting(false);
    }
  };

  const renderProgress = () => (
    <View style={styles.progressWrap}>
      {[1, 2, 3].map((item, index) => {
        const completed = item < step;
        const active = item === step;
        return (
          <View key={item} style={styles.progressItem}>
            <View style={[styles.progressDot, { backgroundColor: completed || active ? ui.red : ui.line }]}>
              {completed ? <Check size={18} color="#fff" /> : <Text style={[styles.progressText, { color: active ? '#fff' : ui.muted }]}>{item}</Text>}
            </View>
            {index < 2 && <View style={[styles.progressLine, { backgroundColor: item < step ? ui.red : ui.line }]} />}
          </View>
        );
      })}
    </View>
  );

  const renderVehicleCard = (item: (typeof VEHICLES)[number]) => {
    const active = vehicleType === item.id;
    return (
      <TouchableOpacity key={item.id} style={[styles.vehicleCard, { backgroundColor: active ? ui.redSoft : ui.surface, borderColor: active ? ui.red : ui.border }]} onPress={() => setVehicleType(item.id)}>
        <Image source={item.image} style={styles.vehicleImage} resizeMode="cover" />
        <Text style={[styles.vehicleTitle, { color: active ? ui.red : ui.text }]}>{item.title}</Text>
        <Text style={[styles.vehicleSubtitle, { color: ui.muted }]}>{item.subtitle}</Text>
      </TouchableOpacity>
    );
  };

  const renderDocumentCard = (title: string, subtitle: string, file: UploadFile | null, onPress: () => void, actionLabel?: string, emphasized?: boolean) => (
    <TouchableOpacity style={[styles.documentCard, { backgroundColor: emphasized ? ui.redSoft : ui.surface, borderColor: emphasized ? ui.red : ui.border }]} onPress={file ? () => setPreviewFile(file) : onPress}>
      <View>
        <Text style={[styles.documentTitle, { color: ui.title }]}>{title}</Text>
        <Text style={[styles.documentSubtitle, { color: ui.muted }]}>{subtitle}</Text>
      </View>
      <TouchableOpacity onPress={file ? () => setPreviewFile(file) : onPress}>
        <Text style={[styles.documentAction, { color: file || actionLabel === 'Required' ? ui.red : ui.muted }]}>{file ? 'View' : actionLabel || 'Upload'}</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const renderPickerField = (label: string, value: string, setValue: (value: string) => void, options: string[], half?: boolean) => (
    <View style={[styles.fieldWrap, half && styles.halfField]}>
      <Text style={[styles.fieldLabel, { color: ui.title }]}>{label}</Text>
      <View style={[styles.selectBox, { backgroundColor: ui.surface, borderColor: ui.border }]}>
        <Picker selectedValue={value} onValueChange={setValue} style={{ color: ui.text }} dropdownIconColor={ui.muted}>
          {options.map((option) => <Picker.Item key={option} label={option} value={option} />)}
        </Picker>
        <ChevronDown size={18} color={ui.muted} style={styles.selectChevron} />
      </View>
    </View>
  );

  const renderStep1 = () => (
    <>
      <Text style={[styles.sectionEyebrow, { color: ui.muted }]}>WHICH TYPE OF VEHICLE?</Text>
      <Text style={[styles.sectionHeading, { color: ui.title }]}>Select Vehicle Type</Text>
      <View style={styles.vehicleGrid}>{VEHICLES.map(renderVehicleCard)}</View>
      <Text style={[styles.questionHeading, { color: ui.title }]}>Is the vehicle drivable ?</Text>
      <TouchableOpacity style={[styles.driveCard, { backgroundColor: ui.surface, borderColor: ui.border }]} onPress={() => setDrivable((current) => !current)}>
        <View>
          <Text style={[styles.driveTitle, { color: ui.muted }]}>{drivable ? 'Vehicle can be driven' : 'Vehicle cannot be driven'}</Text>
          <Text style={[styles.driveSubtitle, { color: ui.muted }]}>{drivable ? 'No towing needed' : 'No, needs towing'}</Text>
        </View>
        <View style={[styles.checkCircle, { backgroundColor: ui.red }]}><Check size={18} color="#fff" /></View>
      </TouchableOpacity>
      <View style={[styles.noteCard, { backgroundColor: ui.yellowBg, borderColor: ui.yellowBorder }]}><Text style={[styles.noteText, { color: ui.yellowText }]}>Non-drivable vehicles get a free flatbed towing pickup, no extra charge.</Text></View>
    </>
  );

  const renderStep2 = () => (
    <>
      <Text style={[styles.sectionEyebrow, { color: ui.muted }]}>VEHICLE DETAILS</Text>
      <Text style={[styles.fieldLabel, { color: ui.title }]}>Registration Number</Text>
      <View style={[styles.inputBox, { backgroundColor: ui.surface, borderColor: ui.border }]}><TextInput value={registrationNumber} onChangeText={setRegistrationNumber} placeholder="e.g. MH02AB1234" placeholderTextColor={ui.muted} style={[styles.input, { color: ui.text }]} autoCapitalize="characters" /></View>
      <View style={styles.twoColRow}>{renderPickerField('Make (Brand)', brand, setBrand, BRANDS, true)}
        <View style={[styles.fieldWrap, styles.halfField]}>
          <Text style={[styles.fieldLabel, { color: ui.title }]}>Model</Text>
          <View style={[styles.inputBox, styles.halfInputBox, { backgroundColor: ui.surface, borderColor: ui.border }]}>
            <TextInput value={model} onChangeText={setModel} placeholder="Write model" placeholderTextColor={ui.muted} style={[styles.input, { color: ui.text }]} />
          </View>
        </View>
      </View>
      <View style={styles.twoColRow}>{renderPickerField('Year of Manufacture', year, setYear, YEARS, true)}{renderPickerField('Fuel Type', fuelType, setFuelType, FUEL_TYPES, true)}</View>
      <Text style={[styles.fieldLabel, { color: ui.title }]}>Vehicle Condition</Text>
      <View style={styles.conditionRow}>{CONDITIONS.map((item) => { const active = condition === item; return <TouchableOpacity key={item} style={[styles.conditionChip, { backgroundColor: active ? ui.redSoft : ui.surface, borderColor: active ? ui.red : ui.border }]} onPress={() => setCondition(item)}><Text style={[styles.conditionChipText, { color: active ? ui.red : ui.muted }]}>{item}</Text></TouchableOpacity>; })}</View>
      <Text style={[styles.fieldLabel, { color: ui.title }]}>Upload Vehicle Photos</Text>
      <TouchableOpacity style={[styles.photoUploadCard, { backgroundColor: ui.redSoft, borderColor: ui.red }]} onPress={pickPhotos}><Plus size={34} color={ui.red} strokeWidth={3} /><Text style={[styles.photoUploadTitle, { color: ui.muted }]}>Front, back, sides + odometer</Text><Text style={[styles.photoUploadSubtitle, { color: ui.muted }]}>Min. 3 photos required</Text></TouchableOpacity>
      {vehiclePhotos.length > 0 && <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photoPreviewRow}>{vehiclePhotos.map((photo) => <View key={photo.uri} style={[styles.photoThumbWrap, { borderColor: ui.border }]}><Image source={{ uri: photo.uri }} style={styles.photoThumb} /><TouchableOpacity style={[styles.photoRemove, { backgroundColor: ui.red }]} onPress={() => setVehiclePhotos((current) => current.filter((item) => item.uri !== photo.uri))}><Text style={styles.photoRemoveText}>X</Text></TouchableOpacity></View>)}</ScrollView>}
      <Text style={[styles.fieldLabel, { color: ui.title }]}>Required Documents</Text>
      {renderDocumentCard('RC Book', 'Registration certificate', rcBook, () => pickDocument(setRcBook, 'RC Book'), 'Upload', true)}
      {renderDocumentCard('ID Proof', 'Aadhaar / PAN card', idProof, () => pickDocument(setIdProof, 'ID Proof'), 'Upload', true)}
      {renderDocumentCard('Insurance Copy', 'Optional but speeds up process', insuranceCopy, () => pickDocument(setInsuranceCopy, 'Insurance Copy'))}
    </>
  );

  const renderStep3 = () => (
    <>
      <Text style={[styles.sectionEyebrow, { color: ui.muted }]}>SCHEDULE PICKUP</Text>
      <Text style={[styles.fieldLabel, { color: ui.title }]}>Preferred Pickup Date</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dateCardsRow}>
        {BOOKING_DATES.map((item) => {
          const active = selectedDate?.toDateString() === item.toDateString();
          return (
            <TouchableOpacity
              key={item.toISOString()}
              style={[styles.dateCard, { backgroundColor: ui.surface, borderColor: ui.border }, active && { backgroundColor: ui.red, borderColor: ui.red }]}
              onPress={() => setSelectedDate(item)}
            >
              <Text style={[styles.dateDay, { color: active ? '#fff' : ui.muted }]}>{format(item, 'EEE')}</Text>
              <Text style={[styles.dateNumber, { color: active ? '#fff' : ui.title }]}>{format(item, 'd')}</Text>
              <Text style={[styles.dateMonth, { color: active ? '#fff' : ui.muted }]}>{format(item, 'MMM')}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      <Text style={[styles.fieldLabel, { color: ui.title }]}>Available Time Slots</Text>
      <View style={styles.timeGrid}>{availableTimeSlots.map((slot) => { const active = slot === selectedTime; return <TouchableOpacity key={slot} style={[styles.timeCard, { backgroundColor: active ? ui.redSoft : ui.surface, borderColor: active ? ui.red : ui.border }]} onPress={() => setSelectedTime(slot)}><Text style={[styles.timeCardText, { color: active ? ui.red : ui.muted }]}>{slot}</Text></TouchableOpacity>; })}</View>
      <Text style={[styles.fieldLabel, { color: ui.title }]}>Pickup Address</Text>
      <TouchableOpacity style={[styles.addressCard, { backgroundColor: ui.surface, borderColor: ui.border }]} onPress={() => setShowAddressModal(true)}><Text style={[styles.addressText, { color: ui.muted }]}>{selectedAddressText || 'Select pickup address'}</Text><Text style={[styles.changeAddressText, { color: ui.red }]}>Change Address</Text></TouchableOpacity>
      {(!phone || !validatePhone(phone)) && <><Text style={[styles.fieldLabel, { color: ui.title }]}>Contact Number</Text><View style={[styles.inputBox, { backgroundColor: ui.surface, borderColor: ui.border }]}><TextInput value={phone} onChangeText={setPhone} placeholder="Enter contact number" placeholderTextColor={ui.muted} keyboardType="phone-pad" style={[styles.input, { color: ui.text }]} /></View></>}
      <View style={[styles.warningCardLarge, { backgroundColor: ui.yellowBg, borderColor: ui.yellowBorder }]}><Text style={[styles.warningBannerTitle, { color: ui.yellowText }]}>Flatbed towing arranged</Text><Text style={[styles.warningBannerSubtitle, { color: ui.yellowText }]}>Vehicle marked as non-drivable, no extra charge.</Text></View>
      <View style={[styles.summarySection, { backgroundColor: ui.surface, borderColor: ui.border }]}>
        <Text style={[styles.summaryTitle, { color: ui.title }]}>Review Summary</Text>
        {[
          ['Service', 'Vehicle Scrapping'],
          ['Vehicle Type', VEHICLES.find((item) => item.id === vehicleType)?.title || 'N/A'],
          ['Registration', registrationNumber || 'N/A'],
          ['Vehicle Details', `${brand} ${model} ${year}`.trim() || 'N/A'],
          ['Fuel / Condition', `${fuelType || 'N/A'} / ${condition || 'N/A'}`],
          ['Scheduled Date', selectedDate ? format(selectedDate, 'dd-MM-yyyy (EEEE)') : 'N/A'],
          ['Scheduled Time', selectedTime || 'N/A'],
          ['Address', selectedAddressText || 'N/A'],
          ['Contact', phone || 'N/A'],
        ].map(([label, value], index) => (
          <View key={label}>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: ui.muted }]}>{label}</Text>
              <Text style={[styles.summaryValue, { color: ui.title }]}>{value}</Text>
            </View>
            {index < 8 && <View style={[styles.summaryDivider, { backgroundColor: ui.border }]} />}
          </View>
        ))}
      </View>
    </>
  );

  if (success) {
    return <View style={[styles.screen, { backgroundColor: ui.bg, paddingTop: insets.top }]}><View style={[styles.header, { borderBottomColor: ui.faintBorder }]}><TouchableOpacity style={styles.backButton} onPress={() => router.replace('/(tabs)/services')}><ArrowLeft size={26} color={ui.muted} /></TouchableOpacity><Text style={[styles.headerTitle, { color: ui.title }]}>Vehicle Scrapping</Text></View><View style={styles.successWrap}><Image source={require('../../../assets/images/services/vehicle_scrapping/cod_issued.webp')} style={styles.successImage} resizeMode="contain" /><Text style={[styles.successTitle, { color: ui.title }]}>Enquiry Submitted</Text><Text style={[styles.successSubtitle, { color: ui.muted }]}>Your vehicle scrapping request is received and our team will contact you shortly.</Text></View></View>;
  }

  return (
    <View style={[styles.screen, { backgroundColor: ui.bg, paddingTop: insets.top }]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.header, { borderBottomColor: ui.faintBorder }]}><TouchableOpacity style={styles.backButton} onPress={() => (step > 1 ? setStep((current) => (current - 1) as Step) : router.back())}><ArrowLeft size={26} color={ui.muted} /></TouchableOpacity><Text style={[styles.headerTitle, { color: ui.title }]}>Vehicle Scrapping</Text></View>
        {renderProgress()}
        {loading ? <View style={styles.loaderWrap}><ActivityIndicator size="large" color={ui.red} /></View> : <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>{step === 1 && renderStep1()}{step === 2 && renderStep2()}{step === 3 && renderStep3()}</ScrollView>}
        <View style={styles.footer}><TouchableOpacity style={[styles.primaryButton, { backgroundColor: ui.red, opacity: (step === 1 && !canContinueStep1) || (step === 2 && !canContinueStep2) || (step === 3 && !canSubmit) ? 0.5 : 1 }]} disabled={(step === 1 && !canContinueStep1) || (step === 2 && !canContinueStep2) || (step === 3 && (!canSubmit || submitting))} onPress={() => { if (step === 1) setStep(2); else if (step === 2) setStep(3); else submitBooking(); }}>{submitting ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.primaryButtonText}>Continue</Text>}</TouchableOpacity></View>
      </KeyboardAvoidingView>
      <Modal visible={showAddressModal} transparent animationType="slide" onRequestClose={() => setShowAddressModal(false)}><View style={styles.modalOverlay}><View style={[styles.modalCard, { backgroundColor: ui.surface }]}><View style={styles.modalHeader}><Text style={[styles.modalTitle, { color: ui.title }]}>Select Pickup Address</Text><TouchableOpacity onPress={() => setShowAddressModal(false)}><Text style={[styles.modalClose, { color: ui.muted }]}>Close</Text></TouchableOpacity></View><ScrollView>{addresses.map((address) => <TouchableOpacity key={address.id} style={[styles.addressOption, { backgroundColor: ui.bg, borderColor: selectedAddress?.id === address.id ? ui.red : ui.border }]} onPress={() => { setSelectedAddress(address); setShowAddressModal(false); }}><View style={styles.addressOptionRow}>{address.name.toLowerCase().includes('home') ? <Home size={18} color={ui.red} /> : address.name.toLowerCase().includes('office') ? <Building size={18} color={ui.red} /> : <MapPin size={18} color={ui.red} />}<View style={styles.addressOptionText}><Text style={[styles.addressOptionName, { color: ui.title }]}>{address.name}</Text><Text style={[styles.addressOptionValue, { color: ui.muted }]}>{[address.room_number, address.street, address.area, address.city, address.state, address.pincode].filter(Boolean).join(', ')}</Text></View></View></TouchableOpacity>)}<TouchableOpacity style={[styles.addAddressButton, { backgroundColor: ui.redSoft, borderColor: ui.red }]} onPress={() => { setShowAddressModal(false); setShowMapPicker(true); }}><Plus size={18} color={ui.red} /><Text style={[styles.addAddressText, { color: ui.red }]}>Add New Address</Text></TouchableOpacity></ScrollView></View></View></Modal>
      <Modal visible={!!previewFile} transparent animationType="fade" onRequestClose={() => setPreviewFile(null)}><View style={styles.modalOverlay}><View style={[styles.previewCard, { backgroundColor: ui.surface }]}><View style={styles.modalHeader}><Text style={[styles.modalTitle, { color: ui.title }]}>Uploaded Document</Text><TouchableOpacity onPress={() => setPreviewFile(null)}><Text style={[styles.modalClose, { color: ui.muted }]}>Close</Text></TouchableOpacity></View>{previewFile?.mimeType?.startsWith('image/') ? <Image source={{ uri: previewFile.uri }} style={styles.previewImage} resizeMode="contain" /> : <View style={styles.previewFallback}><FileText size={44} color={ui.red} /><Text style={[styles.previewName, { color: ui.title }]}>{previewFile?.name}</Text></View>}</View></View></Modal>
      {showMapPicker && <MapLocationPicker onLocationSelect={saveMapLocation} onCancel={() => setShowMapPicker(false)} />}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { height: 76, justifyContent: 'center', alignItems: 'center', borderBottomWidth: 1, position: 'relative' },
  backButton: { position: 'absolute', left: 14, top: 22, padding: 8 },
  headerTitle: { fontSize: 24, fontWeight: '800' },
  progressWrap: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingTop: 18, paddingBottom: 16 },
  progressItem: { flexDirection: 'row', alignItems: 'center' },
  progressDot: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  progressText: { fontSize: 15, fontWeight: '800' },
  progressLine: { width: 92, height: 2, marginHorizontal: 10 },
  loaderWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: 22, paddingBottom: 28 },
  sectionEyebrow: { fontSize: 18, fontWeight: '800', marginBottom: 12 },
  sectionHeading: { fontSize: 18, fontWeight: '800', marginBottom: 14 },
  vehicleGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 18, rowGap: 12 },
  vehicleCard: { width: '46.8%', borderRadius: 14, borderWidth: 1, paddingVertical: 8, paddingHorizontal: 10, alignItems: 'center' },
  vehicleImage: { width: 88, height: 62, borderRadius: 10, marginBottom: 8 },
  vehicleTitle: { fontSize: 14, fontWeight: '800', textAlign: 'center' },
  vehicleSubtitle: { fontSize: 11, fontWeight: '600', marginTop: 2, textAlign: 'center' },
  questionHeading: { fontSize: 17, fontWeight: '800', marginBottom: 12 },
  driveCard: { borderWidth: 1, borderRadius: 14, paddingVertical: 13, paddingHorizontal: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  driveTitle: { fontSize: 16, fontWeight: '800' },
  driveSubtitle: { fontSize: 13, marginTop: 2, fontWeight: '600' },
  checkCircle: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  noteCard: { marginTop: 20, borderRadius: 18, borderWidth: 1.5, borderStyle: 'dashed', paddingVertical: 14, paddingHorizontal: 14 },
  noteText: { fontSize: 15, fontStyle: 'italic', lineHeight: 22 },
  noteSmallText: { fontSize: 14, fontStyle: 'italic', lineHeight: 20 },
  fieldLabel: { fontSize: 17, fontWeight: '800', marginBottom: 10 },
  inputBox: { height: 50, borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, justifyContent: 'center', marginBottom: 18 },
  halfInputBox: { marginBottom: 14 },
  input: { fontSize: 15, fontWeight: '700' },
  twoColRow: { flexDirection: 'row', justifyContent: 'space-between' },
  fieldWrap: { marginBottom: 4 },
  halfField: { width: '47%' },
  selectBox: { height: 50, borderRadius: 12, borderWidth: 1, overflow: 'hidden', marginBottom: 14, justifyContent: 'center' },
  selectChevron: { position: 'absolute', right: 12, top: 16 },
  conditionRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 18, rowGap: 10, columnGap: 10 },
  conditionChip: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 18, paddingVertical: 8 },
  conditionChipText: { fontSize: 13, fontWeight: '700' },
  photoUploadCard: { borderRadius: 16, borderWidth: 1.5, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', paddingVertical: 24, marginBottom: 14 },
  photoUploadTitle: { marginTop: 10, fontSize: 14, fontWeight: '800' },
  photoUploadSubtitle: { fontSize: 14, fontWeight: '800' },
  photoPreviewRow: { paddingBottom: 6, gap: 10, marginBottom: 12 },
  photoThumbWrap: { width: 92, height: 92, borderRadius: 12, borderWidth: 1, overflow: 'hidden', position: 'relative' },
  photoThumb: { width: '100%', height: '100%' },
  photoRemove: { position: 'absolute', right: 6, top: 6, width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  photoRemoveText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  documentCard: { height: 78, borderRadius: 14, borderWidth: 1, paddingHorizontal: 20, marginBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  documentTitle: { fontSize: 17, fontWeight: '800' },
  documentSubtitle: { fontSize: 12, marginTop: 4, fontWeight: '600' },
  documentAction: { fontSize: 14, fontWeight: '800', textDecorationLine: 'underline' },
  dateCardsRow: { paddingBottom: 6, gap: 10, marginBottom: 14 },
  dateCard: { borderWidth: 1, borderRadius: 14, paddingVertical: 10, paddingHorizontal: 14, marginRight: 10, alignItems: 'center', minWidth: 72 },
  dateDay: { fontSize: 12, marginBottom: 4, fontWeight: '600' },
  dateNumber: { fontSize: 18, fontWeight: '800' },
  dateMonth: { fontSize: 12, marginTop: 2, fontWeight: '600' },
  timeGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 10, marginBottom: 18 },
  timeCard: { width: '30.8%', height: 42, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  timeCardText: { fontSize: 13, fontWeight: '800' },
  addressCard: { borderRadius: 14, borderWidth: 1, paddingHorizontal: 18, paddingVertical: 14, marginBottom: 18 },
  addressText: { fontSize: 13, lineHeight: 18, fontWeight: '600' },
  changeAddressText: { marginTop: 6, fontSize: 14, fontWeight: '800' },
  warningCardLarge: { borderWidth: 1.5, borderRadius: 14, paddingHorizontal: 18, paddingVertical: 14 },
  warningBannerTitle: { fontSize: 15, fontWeight: '800' },
  warningBannerSubtitle: { fontSize: 14, marginTop: 3, fontWeight: '500' },
  summarySection: { borderWidth: 1, borderRadius: 16, padding: 16, marginTop: 18 },
  summaryTitle: { fontSize: 16, fontWeight: '800', marginBottom: 12 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, paddingVertical: 8 },
  summaryLabel: { fontSize: 13, flex: 1 },
  summaryValue: { fontSize: 13, fontWeight: '700', flex: 1, textAlign: 'right' },
  summaryDivider: { height: 1 },
  footer: { paddingHorizontal: 22, paddingTop: 10, paddingBottom: 20 },
  primaryButton: { height: 54, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  primaryButtonText: { color: '#fff', fontSize: 18, fontWeight: '800' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalCard: { borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingHorizontal: 18, paddingTop: 18, paddingBottom: 20, maxHeight: '72%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  modalTitle: { fontSize: 17, fontWeight: '800' },
  modalClose: { fontSize: 14, fontWeight: '700' },
  addressOption: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 14, marginBottom: 10 },
  addressOptionRow: { flexDirection: 'row', alignItems: 'flex-start' },
  addressOptionText: { flex: 1, marginLeft: 10 },
  addressOptionName: { fontSize: 14, fontWeight: '800', marginBottom: 3 },
  addressOptionValue: { fontSize: 12, lineHeight: 18, fontWeight: '600' },
  addAddressButton: { borderRadius: 14, borderWidth: 1, paddingVertical: 14, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  addAddressText: { fontSize: 14, fontWeight: '800' },
  previewCard: { margin: 20, marginTop: 100, borderRadius: 18, padding: 16 },
  previewImage: { width: '100%', height: 360 },
  previewFallback: { alignItems: 'center', justifyContent: 'center', paddingVertical: 34 },
  previewName: { fontSize: 14, fontWeight: '700', marginTop: 10 },
  successWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 },
  successImage: { width: 220, height: 180, marginBottom: 16 },
  successTitle: { fontSize: 24, fontWeight: '800' },
  successSubtitle: { fontSize: 14, lineHeight: 20, textAlign: 'center', marginTop: 10 },
});
