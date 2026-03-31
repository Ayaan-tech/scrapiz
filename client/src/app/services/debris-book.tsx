import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { addDays, format, setHours, setMinutes, startOfToday } from 'date-fns';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import Toast from 'react-native-toast-message';
import { ArrowLeft, Building, Check, Home, MapPin, Plus } from 'lucide-react-native';
import { AddressSummary, AuthService, ServiceBookingPayload } from '../../api/apiService';
import { useTheme } from '../../context/ThemeContext';
import { useLocation } from '../../context/LocationContext';
import MapLocationPicker from '../../components/MapLocationPicker';
import { LocationResult } from '../../utils/addressHelpers';

type Step = 1 | 2 | 3;
type UploadFile = { uri: string; name: string; mimeType?: string };

const DEBRIS_TYPES = [
  { id: 'construction', title: 'Construction Debris', subtitle: 'Bricks, tiles, sand, concrete,\nplaster, etc.', price: 'Rs 8,000+', tag: 'Heavy machinery', image: require('../../../assets/images/services/debris_removal/debris_removal.webp') },
  { id: 'wood', title: 'Wood & Furniture', subtitle: 'Old furniture, doors, window\nframes.', price: 'Rs 3,500+', tag: 'Precision', image: require('../../../assets/images/services/debris_removal/wood_furniture_converted.webp') },
  { id: 'household', title: 'Household Junk', subtitle: 'Appliances, mattresses, mixed\njunk.', price: 'Rs 2,000+', tag: 'Same-day', image: require('../../../assets/images/services/debris_removal/household_junk_converted.webp') },
  { id: 'metal', title: 'Metal Scrap', subtitle: 'Grills, rods, pipes, old machinery.', price: 'Rs 800+', tag: 'Most popular', image: require('../../../assets/images/services/debris_removal/metal_Scrap_converted.webp') },
  { id: 'garden', title: 'Garden / Green waste', subtitle: 'Branches, soil, plant cuttings.', price: 'Rs 5,000+', tag: 'Structural', image: require('../../../assets/images/services/debris_removal/garden_green_converted.webp') },
];
const VOLUMES = [
  { id: 'small', title: 'Small', price: '₹ 799 -\n1,200', image: require('../../../assets/images/services/debris_removal/small_converted.webp') },
  { id: 'medium', title: 'Medium', price: '₹ 1,800 -\n2,800', image: require('../../../assets/images/services/debris_removal/medium_converted.webp') },
  { id: 'large', title: 'Large', price: '₹ 3,500 -\n5,500', image: require('../../../assets/images/services/debris_removal/Large_converted.webp') },
  { id: 'xlarge', title: 'Large', price: '₹ 3,500 -\n5,500', image: require('../../../assets/images/services/debris_removal/Large_converted.webp') },
  { id: 'bulk', title: 'Bulk / site', price: 'Custom\nquote', image: require('../../../assets/images/services/debris_removal/Bulksite_converted.webp') },
];
const TIME_SLOTS = ['09:00 AM', '11:00 AM', '01:00 PM', '03:00 PM', '05:00 PM', '07:00 PM'];
const DATES = Array.from({ length: 5 }, (_, i) => addDays(startOfToday(), i));

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

export default function DebrisBookScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();
  const { reloadAddresses } = useLocation();
  const ui = useMemo(() => ({
    bg: isDark ? '#11151C' : '#FFFFFF',
    surface: isDark ? '#171C24' : '#FFFFFF',
    card: isDark ? '#1C222C' : '#F3F3F3',
    border: isDark ? '#36404C' : '#D9D9D9',
    title: isDark ? '#F5F7FA' : '#161616',
    muted: isDark ? '#AAB2BE' : '#7A7A7A',
    primary: '#EE7A09',
    primarySoft: isDark ? 'rgba(238,122,9,0.18)' : '#FFF1E3',
    green: '#29A745',
    red: '#D63535',
    yellowBg: isDark ? '#2E2412' : '#FFF8E8',
  }), [isDark]);

  const [step, setStep] = useState<Step>(1);
  const [debrisType, setDebrisType] = useState('construction');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [addresses, setAddresses] = useState<AddressSummary[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<AddressSummary | null>(null);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [volume, setVolume] = useState('medium');
  const [buildingFloor, setBuildingFloor] = useState('1');
  const [liftAvailable, setLiftAvailable] = useState(true);
  const [hazardousMaterial, setHazardousMaterial] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(DATES[0]);
  const [selectedTime, setSelectedTime] = useState<string | null>('09:00 AM');
  const [notes, setNotes] = useState('');
  const [reviewPhotos, setReviewPhotos] = useState<UploadFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [step2BottomReached, setStep2BottomReached] = useState(false);

  const selectedAddressText = selectedAddress ? [selectedAddress.room_number, selectedAddress.street, selectedAddress.area, selectedAddress.city, selectedAddress.state, selectedAddress.pincode].filter(Boolean).join(', ') : '';

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

  const saveMapLocation = async (location: LocationResult) => {
    try {
      const created = await AuthService.createAddress({ name: 'Service Address', phone_number: phone || '', room_number: '', street: location.address.split(',')[0] || '', area: location.area, city: location.city, state: location.state, country: 'India', pincode: parseInt(location.pincode, 10) || 0, delivery_suggestion: '' } as any);
      setAddresses((current) => [...current, created]);
      setSelectedAddress(created);
      setShowMapPicker(false);
      reloadAddresses();
    } catch (error: any) {
      Alert.alert('Address Error', error.message || 'Unable to save address');
    }
  };

  const pickReviewPhotos = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ allowsMultipleSelection: true, mediaTypes: ImagePicker.MediaTypeOptions.Images, selectionLimit: Math.max(0, 6 - reviewPhotos.length), quality: 0.8 });
    if (!result.canceled) {
      setReviewPhotos((current) => [...current, ...result.assets.map((asset, index) => ({ uri: asset.uri, name: asset.fileName || `debris-${Date.now()}-${index + 1}.jpg`, mimeType: asset.mimeType }))]);
    }
  };

  const buildPreferredDateTime = () => {
    if (!selectedDate || !selectedTime) throw new Error('Select date and time');
    const match = selectedTime.match(/(\d+):(\d+) (AM|PM)/);
    if (!match) throw new Error('Invalid time format');
    let hour = parseInt(match[1], 10);
    const minute = parseInt(match[2], 10);
    if (match[3] === 'PM' && hour < 12) hour += 12;
    if (match[3] === 'AM' && hour === 12) hour = 0;
    return setMinutes(setHours(new Date(selectedDate), hour), minute).toISOString();
  };

  const canContinueStep2 = name.trim() && validatePhone(phone) && selectedAddress && volume && buildingFloor.trim() && selectedDate && selectedTime;
  const canSubmit = reviewPhotos.length > 0;

  const submitBooking = async () => {
    try {
      setSubmitting(true);
      const payload: ServiceBookingPayload = {
        service: 'junk-removal',
        name: name.trim(),
        phone: phone.trim(),
        address: selectedAddressText,
        preferredDateTime: buildPreferredDateTime(),
        notes: notes.trim() || undefined,
        service_details: {
          service_type: 'debris_removal',
          debris_type: debrisType,
          volume,
          building_floor: buildingFloor,
          lift_available: liftAvailable,
          hazardous_material: hazardousMaterial,
          uploaded_photos: reviewPhotos.map((photo) => photo.name),
        },
      };
      await AuthService.createServiceBooking(payload);
      setSuccess(true);
      setTimeout(() => router.replace('/(tabs)/services'), 2200);
    } catch (error: any) {
      Alert.alert('Booking Failed', error.message || 'Unable to submit debris removal booking');
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
            <View style={[styles.progressDot, { backgroundColor: completed || active ? ui.primary : ui.border }]}>
              {completed ? <Check size={18} color="#fff" /> : <Text style={[styles.progressText, { color: active ? '#fff' : ui.muted }]}>{item}</Text>}
            </View>
            {index < 2 && <View style={[styles.progressLine, { backgroundColor: item < step ? ui.primary : ui.border }]} />}
          </View>
        );
      })}
    </View>
  );

  const renderStep1 = () => (
    <>
      <Text style={[styles.sectionEyebrow, { color: ui.muted }]}>SELECT DEBRIS TYPE</Text>
      {DEBRIS_TYPES.map((item) => {
        const active = debrisType === item.id;
        return (
          <TouchableOpacity key={item.id} style={[styles.debrisCard, { backgroundColor: ui.surface, borderColor: active ? ui.primary : ui.border }]} onPress={() => setDebrisType(item.id)}>
            <Image source={item.image} style={styles.debrisImage} />
            <View style={styles.debrisText}>
              <Text style={[styles.debrisTitle, { color: ui.title }]}>{item.title}</Text>
              <Text style={[styles.debrisSubtitle, { color: ui.muted }]}>{item.subtitle}</Text>
              <View style={styles.tagRow}>
                <View style={[styles.priceTag, { borderColor: ui.primary }]}><Text style={[styles.tagText, { color: ui.primary }]}>{item.price}</Text></View>
                <View style={[styles.infoTag, { borderColor: item.id === 'wood' || item.id === 'metal' ? '#1E9BEA' : ui.primary }]}><Text style={[styles.tagText, { color: item.id === 'wood' || item.id === 'metal' ? '#1E9BEA' : ui.primary }]}>{item.tag}</Text></View>
              </View>
            </View>
            <View style={[styles.radioCircle, { borderColor: active ? ui.primary : ui.border, backgroundColor: active ? ui.primary : 'transparent' }]}>{active && <Check size={16} color="#fff" />}</View>
          </TouchableOpacity>
        );
      })}
    </>
  );

  const renderStep2 = () => (
    <>
      <Text style={[styles.sectionEyebrow, { color: ui.muted }]}>SCHEDULE SERVICE</Text>
      <Text style={[styles.sectionHeading, { color: ui.title }]}>Contact Details</Text>
      <View style={[styles.inputBox, { backgroundColor: ui.surface, borderColor: ui.border }]}><TextInput value={name} onChangeText={setName} placeholder="Enter your Full Name" placeholderTextColor={ui.muted} style={[styles.input, { color: ui.title }]} /></View>
      <View style={[styles.inputBox, { backgroundColor: ui.surface, borderColor: ui.border }]}><TextInput value={phone} onChangeText={setPhone} placeholder="Enter your phone number" placeholderTextColor={ui.muted} keyboardType="phone-pad" style={[styles.input, { color: ui.title }]} /></View>
      <Text style={[styles.sectionHeading, { color: ui.title }]}>Service Address</Text>
      <TouchableOpacity style={[styles.addressSelect, { borderColor: ui.border, backgroundColor: ui.surface }]} onPress={() => setShowAddressModal(true)}><Text style={[styles.addressSelectText, { color: selectedAddress ? ui.title : ui.primary }]}>{selectedAddress ? selectedAddressText : '+ Select Address'}</Text></TouchableOpacity>
      <Text style={[styles.sectionHeading, { color: ui.title }]}>Estimate Volume</Text>
      <View style={styles.volumeRow}>{VOLUMES.map((item) => { const active = volume === item.id; return <TouchableOpacity key={item.id} style={[styles.volumeCard, { backgroundColor: ui.surface, borderColor: active ? ui.primary : ui.border }]} onPress={() => setVolume(item.id)}><Image source={item.image} style={styles.volumeImage} resizeMode="cover" /><Text style={[styles.volumeTitle, { color: active ? ui.primary : ui.title }]}>{item.title}</Text><Text style={[styles.volumePrice, { color: ui.primary }]}>{item.price}</Text></TouchableOpacity>; })}</View>
      <View style={styles.floorRow}><Text style={[styles.sectionHeading, { color: ui.title, marginBottom: 0 }]}>Building Floor ?</Text><View style={[styles.floorInputWrap, { backgroundColor: ui.surface, borderColor: ui.border }]}><TextInput value={buildingFloor} onChangeText={(value) => setBuildingFloor(value.replace(/[^0-9]/g, ''))} keyboardType="numeric" style={[styles.floorInput, { color: ui.title }]} /></View></View>
      <View style={styles.liftRow}><Text style={[styles.sectionHeading, { color: ui.title, marginBottom: 0 }]}>Lift Available ?</Text><View style={styles.liftOptions}>{[true, false].map((value) => { const active = liftAvailable === value; return <TouchableOpacity key={String(value)} style={styles.liftOption} onPress={() => setLiftAvailable(value)}><View style={[styles.radioCircle, { borderColor: active ? ui.primary : ui.border, backgroundColor: active ? ui.primary : 'transparent' }]}>{active && <Check size={16} color="#fff" />}</View><Text style={[styles.liftLabel, { color: ui.muted }]}>{value ? 'Yes' : 'No'}</Text></TouchableOpacity>; })}</View></View>
      <View style={[styles.infoBox, { backgroundColor: ui.card, borderColor: ui.border }]}><Text style={[styles.infoText, { color: ui.muted }]}>Floors above 2nd without lift attract a small manual-carry surcharge shown transparently in your quote.</Text></View>
      <View style={[styles.hazardBox, { backgroundColor: ui.primarySoft, borderColor: ui.primary }]}><Text style={[styles.hazardTitle, { color: ui.primary }]}>Hazardous material check.</Text><Text style={[styles.hazardText, { color: ui.primary }]}>Does your debris contain asbestos sheets, chemical drums, paint cans, or medical waste?</Text><View style={styles.hazardButtons}><TouchableOpacity style={[styles.hazardButton, { backgroundColor: hazardousMaterial ? ui.surface : '#E9F8EC', borderColor: '#56AE67' }]} onPress={() => setHazardousMaterial(false)}><Text style={[styles.hazardButtonText, { color: '#208338' }]}>No, it doesn’t</Text></TouchableOpacity><TouchableOpacity style={[styles.hazardButton, { backgroundColor: hazardousMaterial ? '#FFECEC' : ui.surface, borderColor: '#D63535' }]} onPress={() => setHazardousMaterial(true)}><Text style={[styles.hazardButtonText, { color: '#C12C2C' }]}>Yes, it does</Text></TouchableOpacity></View></View>
      <Text style={[styles.sectionHeading, { color: ui.title }]}>Select Date</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dateCardsRow}>{DATES.map((item) => { const active = selectedDate?.toDateString() === item.toDateString(); return <TouchableOpacity key={item.toISOString()} style={[styles.dateCard, { backgroundColor: ui.surface, borderColor: ui.border }, active && { backgroundColor: ui.primary, borderColor: ui.primary }]} onPress={() => setSelectedDate(item)}><Text style={[styles.dateDay, { color: active ? '#fff' : ui.muted }]}>{format(item, 'EEE')}</Text><Text style={[styles.dateNumber, { color: active ? '#fff' : ui.title }]}>{format(item, 'd')}</Text><Text style={[styles.dateMonth, { color: active ? '#fff' : ui.muted }]}>{format(item, 'MMM')}</Text></TouchableOpacity>; })}</ScrollView>
      <Text style={[styles.sectionHeading, { color: ui.title }]}>Select Time</Text>
      <View style={styles.timeGrid}>{availableTimeSlots.map((slot) => { const active = slot === selectedTime; return <TouchableOpacity key={slot} style={[styles.timeCard, { backgroundColor: active ? ui.primarySoft : ui.surface, borderColor: active ? ui.primary : ui.border }]} onPress={() => setSelectedTime(slot)}><Text style={[styles.timeCardText, { color: active ? ui.primary : ui.muted }]}>{slot}</Text></TouchableOpacity>; })}</View>
      <Text style={[styles.sectionHeading, { color: ui.title }]}>Additional Notes</Text>
      <View style={[styles.inputBox, { backgroundColor: ui.surface, borderColor: ui.border }]}><TextInput value={notes} onChangeText={setNotes} placeholder="Any specific requirements?" placeholderTextColor={ui.muted} style={[styles.input, { color: ui.title }]} /></View>
    </>
  );

  const renderStep3 = () => (
    <>
      <Text style={[styles.sectionEyebrow, { color: ui.muted }]}>REVIEW SUMMARY</Text>
      <View style={[styles.summaryCard, { backgroundColor: ui.card }]}>
        <Text style={[styles.summaryHeading, { color: ui.title }]}>Booking Details</Text>
        {[
          ['Service', 'Debris Removal'],
          ['Scheduled Date', selectedDate ? format(selectedDate, 'dd-MM-yyyy (EEEE)') : 'N/A'],
          ['Scheduled Time', selectedTime || 'N/A'],
          ['Address', selectedAddressText || 'N/A'],
          ['Contact', phone || 'N/A'],
          ['Volume', VOLUMES.find((item) => item.id === volume)?.title || 'N/A'],
          ['Building Floor', buildingFloor || 'N/A'],
          ['Lift', liftAvailable ? 'Available' : 'Not Available'],
          ['Hazardous Material', hazardousMaterial ? 'Yes' : 'No'],
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
      <Text style={[styles.sectionHeading, { color: ui.title }]}>Upload Photos (Required)</Text>
      <TouchableOpacity style={[styles.photoSelect, { borderColor: ui.border, backgroundColor: ui.surface }]} onPress={pickReviewPhotos}><Text style={[styles.photoSelectText, { color: ui.primary }]}>+ Select Photos</Text></TouchableOpacity>
      {reviewPhotos.length > 0 && <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.reviewPhotoRow}>{reviewPhotos.map((photo) => <Image key={photo.uri} source={{ uri: photo.uri }} style={styles.reviewPhoto} />)}</ScrollView>}
      <Text style={[styles.reviewNote, { color: ui.muted }]}>Our team will contact you shortly to confirm the details.</Text>
      <Image source={require('../../../assets/images/services/debris_removal/thank_you_debris_Removal_converted.webp')} style={styles.thankYouImage} resizeMode="cover" />
    </>
  );

  if (success) {
    return <View style={[styles.screen, { backgroundColor: ui.bg, paddingTop: insets.top }]}><View style={[styles.header, { borderBottomColor: ui.border }]}><TouchableOpacity style={styles.backButton} onPress={() => router.replace('/(tabs)/services')}><ArrowLeft size={26} color={ui.muted} /></TouchableOpacity><Text style={[styles.headerTitle, { color: ui.title }]}>Debris Removal</Text></View><View style={styles.successWrap}><Image source={require('../../../assets/images/services/debris_removal/thank_you_debris_Removal_converted.webp')} style={styles.successImg} resizeMode="cover" /></View></View>;
  }

  return (
    <View style={[styles.screen, { backgroundColor: ui.bg, paddingTop: insets.top }]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.header, { borderBottomColor: ui.border }]}><TouchableOpacity style={styles.backButton} onPress={() => (step > 1 ? setStep((current) => (current - 1) as Step) : router.back())}><ArrowLeft size={26} color={ui.muted} /></TouchableOpacity><Text style={[styles.headerTitle, { color: ui.title }]}>Debris Removal</Text></View>
        {renderProgress()}
        {loading ? <View style={styles.loaderWrap}><ActivityIndicator size="large" color={ui.primary} /></View> : <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content} onScroll={(event) => { if (step === 2) { const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent; if (layoutMeasurement.height + contentOffset.y >= contentSize.height - 24) setStep2BottomReached(true); } }} scrollEventThrottle={16}>{step === 1 && renderStep1()}{step === 2 && renderStep2()}{step === 3 && renderStep3()}</ScrollView>}
        <View style={styles.footer}>
          {step === 1 && <TouchableOpacity style={[styles.primaryButton, { backgroundColor: ui.primary }]} onPress={() => setStep(2)}><Text style={styles.primaryButtonText}>Continue</Text></TouchableOpacity>}
          {step === 2 && step2BottomReached && canContinueStep2 && <TouchableOpacity style={[styles.primaryButton, { backgroundColor: ui.primary }]} onPress={() => setStep(3)}><Text style={styles.primaryButtonText}>Continue</Text></TouchableOpacity>}
          {step === 3 && <TouchableOpacity style={[styles.primaryButton, { backgroundColor: ui.primary, opacity: canSubmit ? 1 : 0.5 }]} disabled={!canSubmit || submitting} onPress={submitBooking}>{submitting ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.primaryButtonText}>Confirm Booking</Text>}</TouchableOpacity>}
        </View>
      </KeyboardAvoidingView>
      <Modal visible={showAddressModal} transparent animationType="slide" onRequestClose={() => setShowAddressModal(false)}><View style={styles.modalOverlay}><View style={[styles.modalCard, { backgroundColor: ui.surface }]}><View style={styles.modalHeader}><Text style={[styles.modalTitle, { color: ui.title }]}>Select Address</Text><TouchableOpacity onPress={() => setShowAddressModal(false)}><Text style={[styles.modalClose, { color: ui.muted }]}>Close</Text></TouchableOpacity></View><ScrollView>{addresses.map((address) => <TouchableOpacity key={address.id} style={[styles.addressItem, { borderColor: selectedAddress?.id === address.id ? ui.primary : ui.border, backgroundColor: ui.bg }]} onPress={() => { setSelectedAddress(address); setShowAddressModal(false); }}><View style={styles.addressRow}>{address.name.toLowerCase().includes('home') ? <Home size={18} color={ui.primary} /> : address.name.toLowerCase().includes('office') ? <Building size={18} color={ui.primary} /> : <MapPin size={18} color={ui.primary} />}<View style={styles.addressInfo}><Text style={[styles.addressName, { color: ui.title }]}>{address.name}</Text><Text style={[styles.addressValue, { color: ui.muted }]}>{[address.room_number, address.street, address.area, address.city, address.state, address.pincode].filter(Boolean).join(', ')}</Text></View></View></TouchableOpacity>)}<TouchableOpacity style={[styles.addAddress, { backgroundColor: ui.primarySoft, borderColor: ui.primary }]} onPress={() => { setShowAddressModal(false); setShowMapPicker(true); }}><Plus size={18} color={ui.primary} /><Text style={[styles.addAddressText, { color: ui.primary }]}>Add Another Address</Text></TouchableOpacity></ScrollView></View></View></Modal>
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
  sectionEyebrow: { fontSize: 18, fontWeight: '800', marginBottom: 16 },
  sectionHeading: { fontSize: 17, fontWeight: '800', marginBottom: 12 },
  debrisCard: { borderWidth: 1, borderRadius: 14, padding: 12, marginBottom: 12, flexDirection: 'row', alignItems: 'center' },
  debrisImage: { width: 60, height: 60, borderRadius: 12, marginRight: 10 },
  debrisText: { flex: 1 },
  debrisTitle: { fontSize: 16, fontWeight: '800', marginBottom: 3 },
  debrisSubtitle: { fontSize: 12, lineHeight: 17, marginBottom: 6 },
  tagRow: { flexDirection: 'row', gap: 8 },
  priceTag: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 1 },
  infoTag: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 1 },
  tagText: { fontSize: 11, fontWeight: '700' },
  radioCircle: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  inputBox: { height: 48, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, justifyContent: 'center', marginBottom: 12 },
  input: { fontSize: 15, fontWeight: '600' },
  addressSelect: { height: 48, borderWidth: 1, borderStyle: 'dashed', borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  addressSelectText: { fontSize: 16, fontWeight: '800' },
  volumeRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12, marginBottom: 12 },
  volumeCard: { width: '18.6%', borderWidth: 1, borderRadius: 12, paddingVertical: 8, alignItems: 'center' },
  volumeImage: { width: 46, height: 38, borderRadius: 8, marginBottom: 6 },
  volumeTitle: { fontSize: 12, fontWeight: '800', textAlign: 'center' },
  volumePrice: { fontSize: 11, fontWeight: '800', textAlign: 'center', marginTop: 2 },
  floorRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  floorInputWrap: { width: 150, height: 40, borderWidth: 1, borderRadius: 12, justifyContent: 'center', paddingHorizontal: 14 },
  floorInput: { fontSize: 18, fontWeight: '700', textAlign: 'center' },
  liftRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  liftOptions: { flexDirection: 'row', gap: 18 },
  liftOption: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  liftLabel: { fontSize: 14, fontWeight: '700' },
  infoBox: { borderWidth: 1, borderRadius: 14, padding: 16, marginBottom: 16 },
  infoText: { fontSize: 13, fontWeight: '700', textAlign: 'center', lineHeight: 18 },
  hazardBox: { borderWidth: 1, borderRadius: 14, padding: 16, marginBottom: 18 },
  hazardTitle: { fontSize: 16, fontWeight: '800', textAlign: 'center' },
  hazardText: { fontSize: 14, marginTop: 10, textAlign: 'center', lineHeight: 18 },
  hazardButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 14 },
  hazardButton: { width: '47%', borderWidth: 1, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  hazardButtonText: { fontSize: 14, fontWeight: '800' },
  dateCardsRow: { gap: 10, paddingBottom: 6, marginBottom: 16 },
  dateCard: { borderWidth: 1, borderRadius: 12, paddingVertical: 10, width: 58, alignItems: 'center', marginRight: 10 },
  dateDay: { fontSize: 11, fontWeight: '700' },
  dateNumber: { fontSize: 17, fontWeight: '800', marginVertical: 2 },
  dateMonth: { fontSize: 11, fontWeight: '700' },
  timeGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 10, marginBottom: 18 },
  timeCard: { width: '30.8%', height: 42, borderWidth: 1, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  timeCardText: { fontSize: 13, fontWeight: '800' },
  summaryCard: { borderRadius: 14, padding: 16, marginBottom: 16 },
  summaryHeading: { fontSize: 18, fontWeight: '800', marginBottom: 12 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, paddingVertical: 6 },
  summaryLabel: { fontSize: 13, flex: 1, fontWeight: '700' },
  summaryValue: { fontSize: 13, flex: 1, textAlign: 'right', fontWeight: '800' },
  summaryDivider: { height: 1 },
  photoSelect: { height: 114, borderWidth: 1, borderStyle: 'dashed', borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  photoSelectText: { fontSize: 16, fontWeight: '800' },
  reviewPhotoRow: { gap: 10, paddingBottom: 8 },
  reviewPhoto: { width: 84, height: 84, borderRadius: 12, marginRight: 10 },
  reviewNote: { fontSize: 13, fontWeight: '700', marginBottom: 16, textAlign: 'center' },
  thankYouImage: { width: '100%', height: 180, borderRadius: 20, marginBottom: 16 },
  footer: { paddingHorizontal: 22, paddingTop: 8, paddingBottom: 20 },
  primaryButton: { height: 54, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  primaryButtonText: { color: '#fff', fontSize: 18, fontWeight: '800' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalCard: { borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingHorizontal: 18, paddingTop: 18, paddingBottom: 20, maxHeight: '72%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  modalTitle: { fontSize: 17, fontWeight: '800' },
  modalClose: { fontSize: 14, fontWeight: '700' },
  addressItem: { borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 10 },
  addressRow: { flexDirection: 'row', alignItems: 'flex-start' },
  addressInfo: { flex: 1, marginLeft: 10 },
  addressName: { fontSize: 14, fontWeight: '800', marginBottom: 3 },
  addressValue: { fontSize: 12, lineHeight: 18, fontWeight: '600' },
  addAddress: { borderWidth: 1, borderRadius: 14, paddingVertical: 14, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  addAddressText: { fontSize: 14, fontWeight: '800' },
  successWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 22 },
  successImg: { width: '100%', height: 220, borderRadius: 20 },
});
