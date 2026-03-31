import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Building, Check, ChevronDown, Home, MapPin, Plus } from 'lucide-react-native';
import { Picker } from '@react-native-picker/picker';
import { AddressSummary, AuthService, ServiceBookingPayload } from '../../api/apiService';
import { useTheme } from '../../context/ThemeContext';
import { useLocation } from '../../context/LocationContext';
import MapLocationPicker from '../../components/MapLocationPicker';
import { LocationResult } from '../../utils/addressHelpers';

type Step = 1 | 2 | 3;

const SERVICES = [
  { id: 'scrap_collection', title: 'Scrap collection drives', subtitle: 'Metal, plastic, paper & e-waste\ncollected from residents. We sort\n& recycle.', tag: 'Core service - Always included', image: require('../../../assets/images/services/society_tieup/scrap_Collection_Drives.webp') },
  { id: 'dry_waste', title: 'Dry waste collection', subtitle: 'Cardboard, paper, plastic bottles\npicked up flat-to-flat or at common\npoint.', tag: 'Recommended', image: require('../../../assets/images/services/society_tieup/dry_Waste_collection.webp') },
  { id: 'ewaste', title: 'E-waste collection drive', subtitle: 'Old phones, laptops, chargers,\nbatteries - safely disposed at\ncertified facility.', tag: 'Quarterly drive', image: require('../../../assets/images/services/society_tieup/e_waste.webp') },
  { id: 'awareness', title: 'Awareness programme', subtitle: 'Segregation workshops &\nsustainability talks for residents.\nIncreases participation by 3x.', tag: 'High Impact', image: require('../../../assets/images/services/society_tieup/awareness_collectipn.webp') },
  { id: 'vehicle_scrapping', title: 'Vehicle scrapping camp', subtitle: 'Residents earn cash for old\nvehicles. We handle pickup &\nRTO paperwork.', tag: 'Residents earn ₹', image: require('../../../assets/images/services/society_tieup/vehicle_scrapping.webp') },
];
const SOCIETY_TYPES = [
  { id: 'apartment', title: 'Apartment', subtitle: 'High-rise / CHS', image: require('../../../assets/images/services/society_tieup/apartment.webp') },
  { id: 'gated_colony', title: 'Gated Colony', subtitle: 'Row houses / villas', image: require('../../../assets/images/services/society_tieup/gated_colony.webp') },
  { id: 'township', title: 'Township', subtitle: 'Large integrated', image: require('../../../assets/images/services/society_tieup/township.webp') },
  { id: 'under_construction', title: 'Under Construction', subtitle: 'New possession', image: require('../../../assets/images/services/society_tieup/under_construction.webp') },
];

export default function SocietyTieupBookScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();
  const { reloadAddresses } = useLocation();
  const ui = useMemo(() => ({
    bg: isDark ? '#101526' : '#FFFFFF',
    surface: isDark ? '#171E33' : '#FFFFFF',
    border: isDark ? '#36405C' : '#D9D9D9',
    title: isDark ? '#F7F8FA' : '#121212',
    muted: isDark ? '#AAB2C0' : '#787878',
    primary: '#1117A5',
    primarySoft: isDark ? 'rgba(17,23,165,0.22)' : '#E4F5FF',
  }), [isDark]);

  const [step, setStep] = useState<Step>(1);
  const [selectedServices, setSelectedServices] = useState<string[]>(['scrap_collection']);
  const [frequency, setFrequency] = useState('Monthly');
  const [otherRequirement, setOtherRequirement] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('Secretary');
  const [societyType, setSocietyType] = useState('apartment');
  const [societyName, setSocietyName] = useState('');
  const [address, setAddress] = useState('');
  const [towers, setTowers] = useState('3');
  const [flats, setFlats] = useState('100 - 200');
  const [monthlyWaste, setMonthlyWaste] = useState('500 - 1000');
  const [addresses, setAddresses] = useState<AddressSummary[]>([]);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [user, addressList] = await Promise.all([AuthService.getUser(), AuthService.getAddresses()]);
        setName(user.name || '');
        setPhone(user.phone_number || '');
        setAddresses(addressList);
        if (addressList[0]) setAddress([addressList[0].area, addressList[0].city, addressList[0].pincode].filter(Boolean).join(', '));
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const saveMapLocation = async (location: LocationResult) => {
    try {
      const created = await AuthService.createAddress({ name: 'Society Address', phone_number: phone || '', room_number: '', street: location.address.split(',')[0] || '', area: location.area, city: location.city, state: location.state, country: 'India', pincode: parseInt(location.pincode, 10) || 0, delivery_suggestion: '' } as any);
      setAddresses((current) => [...current, created]);
      setAddress([created.area, created.city, created.pincode].filter(Boolean).join(', '));
      setShowMapPicker(false);
      reloadAddresses();
    } catch (error: any) {
      Alert.alert('Address Error', error.message || 'Unable to save society address');
    }
  };

  const canStep2 = selectedServices.length > 0 && frequency.length > 0;
  const canStep3 = name.trim() && phone.trim() && role && societyType && societyName.trim() && address.trim() && towers && flats && monthlyWaste;

  const submitEnquiry = async () => {
    try {
      setSubmitting(true);
      const payload: ServiceBookingPayload = {
        service: 'society-tieup',
        name: name.trim(),
        phone: phone.trim(),
        address: address.trim(),
        preferredDateTime: new Date().toISOString(),
        notes: otherRequirement.trim() || undefined,
        service_details: {
          service_type: 'society_tieup',
          services_selected: selectedServices,
          drive_frequency: frequency,
          contact_role: role,
          society_type: societyType,
          society_name: societyName.trim(),
          towers,
          flats,
          monthly_waste: monthlyWaste,
        },
      };
      await AuthService.createServiceBooking(payload);
      setSuccess(true);
      setTimeout(() => router.replace('/(tabs)/services'), 2200);
    } catch (error: any) {
      Alert.alert('Enquiry Failed', error.message || 'Unable to submit society tie-up enquiry');
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
            <View style={[styles.progressDot, { backgroundColor: completed || active ? ui.primary : ui.border }]}>{completed ? <Check size={18} color="#fff" /> : <Text style={[styles.progressText, { color: active ? '#fff' : ui.muted }]}>{item}</Text>}</View>
            {index < 2 && <View style={[styles.progressLine, { backgroundColor: item < step ? ui.primary : ui.border }]} />}
          </View>
        );
      })}
    </View>
  );

  const renderStep1 = () => (
    <>
      <Text style={[styles.sectionEyebrow, { color: ui.muted }]}>WHAT DOES YOUR SOCIETY NEED?</Text>
      {SERVICES.map((item) => {
        const active = selectedServices.includes(item.id);
        return (
          <TouchableOpacity key={item.id} style={[styles.serviceCard, { backgroundColor: active ? ui.primarySoft : ui.surface, borderColor: active ? '#7ED0FF' : ui.border }]} onPress={() => setSelectedServices((current) => current.includes(item.id) ? current.filter((value) => value !== item.id) : [...current, item.id])}>
            <Image source={item.image} style={styles.serviceImage} />
            <View style={styles.serviceText}><Text style={[styles.serviceTitle, { color: ui.title }]}>{item.title}</Text><Text style={[styles.serviceSubtitle, { color: ui.muted }]}>{item.subtitle}</Text><View style={styles.serviceTag}><Text style={[styles.serviceTagText, { color: '#2C993A' }]}>{item.tag}</Text></View></View>
            <View style={[styles.checkCircle, { borderColor: active ? ui.primary : ui.border, backgroundColor: active ? ui.primary : 'transparent' }]}>{active && <Check size={16} color="#fff" />}</View>
          </TouchableOpacity>
        );
      })}
      <Text style={[styles.sectionEyebrow, { color: ui.muted, marginTop: 22 }]}>PREFERRED DRIVE FREQUENCY</Text>
      <View style={styles.frequencyRow}>{['Fortnightly', 'Monthly', 'Bi-monthly'].map((item) => { const active = frequency === item; return <TouchableOpacity key={item} style={[styles.frequencyChip, { backgroundColor: active ? ui.primarySoft : ui.surface, borderColor: active ? '#7ED0FF' : ui.border }]} onPress={() => setFrequency(item)}><Text style={[styles.frequencyText, { color: active ? ui.primary : ui.muted }]}>{item}</Text></TouchableOpacity>; })}</View>
      <View style={[styles.otherBox, { backgroundColor: ui.primarySoft, borderColor: '#7ED0FF' }]}><TextInput value={otherRequirement} onChangeText={setOtherRequirement} placeholder="ANY OTHER REQUIREMENT?\ne.g. composting support, specific waste type..." placeholderTextColor={ui.muted} multiline style={[styles.otherInput, { color: ui.title }]} /></View>
    </>
  );

  const renderStep2 = () => (
    <>
      <Text style={[styles.sectionEyebrow, { color: ui.muted }]}>SOCIETY DETAILS</Text>
      <Text style={[styles.sectionHeading, { color: ui.title }]}>Contact Details</Text>
      <View style={[styles.inputBox, { backgroundColor: ui.surface, borderColor: ui.border }]}><TextInput value={name} onChangeText={setName} placeholder="Enter your Full Name" placeholderTextColor={ui.muted} style={[styles.input, { color: ui.title }]} /></View>
      <View style={[styles.inputBox, { backgroundColor: ui.surface, borderColor: ui.border }]}><TextInput value={phone} onChangeText={setPhone} placeholder="Enter your phone number" placeholderTextColor={ui.muted} keyboardType="phone-pad" style={[styles.input, { color: ui.title }]} /></View>
      <View style={[styles.selectBox, { backgroundColor: ui.surface, borderColor: ui.border }]}><Picker selectedValue={role} onValueChange={setRole} style={{ color: ui.title }} dropdownIconColor={ui.muted}><Picker.Item label="Secretary" value="Secretary" /><Picker.Item label="Chairman" value="Chairman" /><Picker.Item label="Treasurer" value="Treasurer" /><Picker.Item label="Authoritative Committee Member" value="Authoritative Committee Member" /></Picker><ChevronDown size={18} color={ui.muted} style={styles.selectChevron} /></View>
      <Text style={[styles.sectionHeading, { color: ui.title }]}>Society Type</Text>
      <View style={styles.societyGrid}>{SOCIETY_TYPES.map((item) => { const active = societyType === item.id; return <TouchableOpacity key={item.id} style={[styles.societyCard, { backgroundColor: active ? ui.primarySoft : ui.surface, borderColor: active ? '#7ED0FF' : ui.border }]} onPress={() => setSocietyType(item.id)}><Image source={item.image} style={styles.societyImage} /><Text style={[styles.societyTitle, { color: ui.title }]}>{item.title}</Text><Text style={[styles.societySubtitle, { color: ui.muted }]}>{item.subtitle}</Text></TouchableOpacity>; })}</View>
      <Text style={[styles.sectionHeading, { color: ui.title }]}>Society / Building Name</Text>
      <View style={[styles.inputBox, { backgroundColor: ui.surface, borderColor: ui.border }]}><TextInput value={societyName} onChangeText={setSocietyName} placeholder="e.g. Shree Sai CHS" placeholderTextColor={ui.muted} style={[styles.input, { color: ui.title }]} /></View>
      <Text style={[styles.sectionHeading, { color: ui.title }]}>Full Address</Text>
      <TouchableOpacity style={[styles.inputBox, styles.addressInput, { backgroundColor: ui.surface, borderColor: ui.border }]} onPress={() => setShowAddressModal(true)}><Text style={[styles.input, { color: address ? ui.title : ui.muted }]}>{address || 'Area, city, pincode'}</Text></TouchableOpacity>
      <View style={styles.twoColRow}>
        <View style={styles.halfCol}><Text style={[styles.sectionHeading, { color: ui.title }]}>No. of Towers</Text><View style={[styles.selectBox, { backgroundColor: ui.surface, borderColor: ui.border }]}><Picker selectedValue={towers} onValueChange={setTowers} style={{ color: ui.title }} dropdownIconColor={ui.muted}><Picker.Item label="1" value="1" /><Picker.Item label="2" value="2" /><Picker.Item label="3" value="3" /><Picker.Item label="4+" value="4+" /></Picker><ChevronDown size={18} color={ui.muted} style={styles.selectChevron} /></View></View>
        <View style={styles.halfCol}><Text style={[styles.sectionHeading, { color: ui.title }]}>Total Flats</Text><View style={[styles.selectBox, { backgroundColor: ui.surface, borderColor: ui.border }]}><Picker selectedValue={flats} onValueChange={setFlats} style={{ color: ui.title }} dropdownIconColor={ui.muted}><Picker.Item label="50 - 100" value="50 - 100" /><Picker.Item label="100 - 200" value="100 - 200" /><Picker.Item label="200 - 500" value="200 - 500" /><Picker.Item label="500 +" value="500 +" /></Picker><ChevronDown size={18} color={ui.muted} style={styles.selectChevron} /></View></View>
      </View>
      <Text style={[styles.sectionHeading, { color: ui.title }]}>Approx. Monthly Waste (KG)</Text>
      <View style={styles.wasteRow}>{['<500 kg', '500 - 1000', '1000 + kg'].map((item) => { const active = monthlyWaste === item; return <TouchableOpacity key={item} style={[styles.wasteChip, { backgroundColor: active ? ui.primarySoft : ui.surface, borderColor: active ? '#7ED0FF' : ui.border }]} onPress={() => setMonthlyWaste(item)}><Text style={[styles.wasteText, { color: active ? ui.primary : ui.muted }]}>{item}</Text></TouchableOpacity>; })}</View>
    </>
  );

  const renderStep3 = () => (
    <>
      <Text style={[styles.sectionEyebrow, { color: ui.muted }]}>REVIEW SUMMARY</Text>
      <View style={[styles.summaryCard, { backgroundColor: '#EFEFF2' }]}>
        <View style={styles.summaryHeader}><Text style={[styles.summaryTitle, { color: ui.title }]}>Society details</Text><Text style={[styles.editText, { color: ui.primary }]}>Edit</Text></View>
        {[
          ['Society', societyName || 'N/A'],
          ['Location', address || 'N/A'],
          ['Type', SOCIETY_TYPES.find((item) => item.id === societyType)?.title || 'N/A'],
          ['No. of towers', `${towers} towers`],
          ['Flats', `${flats} flats`],
        ].map(([label, value], index) => <View key={label}>{<View style={styles.summaryRow}><Text style={[styles.summaryLabel, { color: ui.muted }]}>{label}</Text><Text style={[styles.summaryValue, { color: ui.title }]}>{value}</Text></View>}{index < 4 && <View style={styles.summaryDivider} />}</View>)}
      </View>
      <View style={[styles.summaryCard, { backgroundColor: '#EFEFF2' }]}>
        <View style={styles.summaryHeader}><Text style={[styles.summaryTitle, { color: ui.title }]}>Services selected</Text><Text style={[styles.editText, { color: ui.primary }]}>Edit</Text></View>
        <View style={styles.selectedServicesWrap}>{selectedServices.map((id) => { const item = SERVICES.find((service) => service.id === id); return <View key={id} style={styles.selectedPill}><Text style={[styles.selectedPillText, { color: ui.primary }]}>{item?.title.replace(' collection', '').replace(' programme', '')}</Text></View>; })}</View>
        <Text style={[styles.frequencySummary, { color: ui.muted }]}>Frequency: {frequency} drives</Text>
      </View>
      <View style={[styles.submitCard, { backgroundColor: '#E4F5FF', borderColor: '#7ED0FF' }]}>
        <Text style={[styles.submitTitle, { color: ui.primary }]}>What happens after you submit</Text>
        {[
          ['1', 'Our team calls you within\n24 hours.', '24 hrs'],
          ['2', 'Free site visit & custom\nproposal sent.', '3 - 5 days'],
          ['3', 'Agreement signed, first\ndrive scheduled.', '~ 2 weeks'],
        ].map(([stepNo, text, time]) => <View key={stepNo} style={styles.submitRow}><View style={styles.submitStep}><Text style={[styles.submitStepText, { color: ui.primary }]}>{stepNo}</Text></View><Text style={[styles.submitDesc, { color: ui.primary }]}>{text}</Text><Text style={[styles.submitTime, { color: '#7EC8F7' }]}>{time}</Text></View>)}
      </View>
    </>
  );

  if (success) {
    return <View style={[styles.screen, { backgroundColor: ui.bg, paddingTop: insets.top }]}><View style={[styles.header, { borderBottomColor: ui.border }]}><TouchableOpacity style={styles.backButton} onPress={() => router.replace('/(tabs)/services')}><ArrowLeft size={26} color={ui.muted} /></TouchableOpacity><Text style={[styles.headerTitle, { color: ui.title }]}>Society Tie - Up</Text></View><View style={styles.successWrap}><Text style={[styles.successText, { color: ui.primary }]}>Enquiry Submitted</Text></View></View>;
  }

  return (
    <View style={[styles.screen, { backgroundColor: ui.bg, paddingTop: insets.top }]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.header, { borderBottomColor: ui.border }]}><TouchableOpacity style={styles.backButton} onPress={() => (step > 1 ? setStep((current) => (current - 1) as Step) : router.back())}><ArrowLeft size={26} color={ui.muted} /></TouchableOpacity><Text style={[styles.headerTitle, { color: ui.title }]}>Society Tie - Up</Text></View>
        {renderProgress()}
        {loading ? <View style={styles.loaderWrap}><ActivityIndicator size="large" color={ui.primary} /></View> : <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>{step === 1 && renderStep1()}{step === 2 && renderStep2()}{step === 3 && renderStep3()}</ScrollView>}
        <View style={styles.footer}>
          {step === 1 && <TouchableOpacity style={[styles.primaryButton, { backgroundColor: ui.primary, opacity: canStep2 ? 1 : 0.5 }]} disabled={!canStep2} onPress={() => setStep(2)}><Text style={styles.primaryButtonText}>Continue</Text></TouchableOpacity>}
          {step === 2 && <TouchableOpacity style={[styles.primaryButton, { backgroundColor: ui.primary, opacity: canStep3 ? 1 : 0.5 }]} disabled={!canStep3} onPress={() => setStep(3)}><Text style={styles.primaryButtonText}>Continue</Text></TouchableOpacity>}
          {step === 3 && <TouchableOpacity style={[styles.primaryButton, { backgroundColor: ui.primary, opacity: submitting ? 0.7 : 1 }]} disabled={submitting} onPress={submitEnquiry}>{submitting ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.primaryButtonText}>Schedule Enquiry</Text>}</TouchableOpacity>}
        </View>
      </KeyboardAvoidingView>
      <Modal visible={showAddressModal} transparent animationType="slide" onRequestClose={() => setShowAddressModal(false)}><View style={styles.modalOverlay}><View style={[styles.modalCard, { backgroundColor: ui.surface }]}><View style={styles.modalHeader}><Text style={[styles.modalTitle, { color: ui.title }]}>Select Address</Text><TouchableOpacity onPress={() => setShowAddressModal(false)}><Text style={[styles.modalClose, { color: ui.muted }]}>Close</Text></TouchableOpacity></View><ScrollView>{addresses.map((item) => <TouchableOpacity key={item.id} style={[styles.addressItem, { borderColor: ui.border, backgroundColor: ui.bg }]} onPress={() => { setAddress([item.area, item.city, item.pincode].filter(Boolean).join(', ')); setShowAddressModal(false); }}><View style={styles.addressRow}>{item.name.toLowerCase().includes('home') ? <Home size={18} color={ui.primary} /> : item.name.toLowerCase().includes('office') ? <Building size={18} color={ui.primary} /> : <MapPin size={18} color={ui.primary} />}<View style={styles.addressInfo}><Text style={[styles.addressName, { color: ui.title }]}>{item.name}</Text><Text style={[styles.addressValue, { color: ui.muted }]}>{[item.room_number, item.street, item.area, item.city, item.state, item.pincode].filter(Boolean).join(', ')}</Text></View></View></TouchableOpacity>)}<TouchableOpacity style={[styles.addAddress, { backgroundColor: ui.primarySoft, borderColor: '#7ED0FF' }]} onPress={() => { setShowAddressModal(false); setShowMapPicker(true); }}><Plus size={18} color={ui.primary} /><Text style={[styles.addAddressText, { color: ui.primary }]}>Add Another Address</Text></TouchableOpacity></ScrollView></View></View></Modal>
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
  serviceCard: { borderWidth: 1, borderRadius: 14, padding: 12, marginBottom: 12, flexDirection: 'row', alignItems: 'center' },
  serviceImage: { width: 64, height: 64, borderRadius: 12, marginRight: 10 },
  serviceText: { flex: 1 },
  serviceTitle: { fontSize: 16, fontWeight: '800' },
  serviceSubtitle: { fontSize: 12, lineHeight: 16, marginTop: 4 },
  serviceTag: { borderWidth: 1, borderColor: '#56AE67', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2, alignSelf: 'flex-start', marginTop: 6 },
  serviceTagText: { fontSize: 11, fontWeight: '700' },
  checkCircle: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  frequencyRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 18 },
  frequencyChip: { width: '30.8%', borderWidth: 1, borderRadius: 12, alignItems: 'center', justifyContent: 'center', paddingVertical: 14 },
  frequencyText: { fontSize: 15, fontWeight: '800' },
  otherBox: { borderWidth: 1.5, borderStyle: 'dashed', borderRadius: 18, padding: 14, marginBottom: 10 },
  otherInput: { minHeight: 74, fontSize: 16, fontWeight: '700', textAlignVertical: 'top' },
  inputBox: { height: 48, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, justifyContent: 'center', marginBottom: 12 },
  input: { fontSize: 15, fontWeight: '600' },
  selectBox: { height: 48, borderWidth: 1, borderRadius: 12, overflow: 'hidden', marginBottom: 14, justifyContent: 'center' },
  selectChevron: { position: 'absolute', right: 12, top: 16 },
  societyGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12, marginBottom: 16 },
  societyCard: { width: '47%', borderWidth: 1, borderRadius: 14, padding: 10, alignItems: 'center' },
  societyImage: { width: 90, height: 62, borderRadius: 10, marginBottom: 8 },
  societyTitle: { fontSize: 14, fontWeight: '800', textAlign: 'center' },
  societySubtitle: { fontSize: 11, fontWeight: '700', textAlign: 'center', marginTop: 2 },
  addressInput: { justifyContent: 'center' },
  twoColRow: { flexDirection: 'row', justifyContent: 'space-between' },
  halfCol: { width: '47%' },
  wasteRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  wasteChip: { width: '31%', borderWidth: 1, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  wasteText: { fontSize: 14, fontWeight: '800' },
  summaryCard: { borderRadius: 20, padding: 16, marginBottom: 18 },
  summaryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  summaryTitle: { fontSize: 18, fontWeight: '800' },
  editText: { fontSize: 16, fontWeight: '800' },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 6 },
  summaryLabel: { flex: 1, fontSize: 13, fontWeight: '700' },
  summaryValue: { flex: 1, fontSize: 13, fontWeight: '800', textAlign: 'right' },
  summaryDivider: { height: 1, backgroundColor: '#D8D8D8' },
  selectedServicesWrap: { gap: 8 },
  selectedPill: { alignSelf: 'flex-start', borderWidth: 1, borderColor: '#7ED0FF', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 4, backgroundColor: '#E4F5FF' },
  selectedPillText: { fontSize: 13, fontWeight: '800' },
  frequencySummary: { fontSize: 13, fontWeight: '700', marginTop: 12 },
  submitCard: { borderWidth: 1, borderRadius: 18, padding: 16, marginBottom: 12 },
  submitTitle: { fontSize: 18, fontWeight: '800', marginBottom: 12 },
  submitRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 10 },
  submitStep: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#8ED1FF', alignItems: 'center', justifyContent: 'center' },
  submitStepText: { fontSize: 14, fontWeight: '800' },
  submitDesc: { flex: 1, fontSize: 14, fontWeight: '700', lineHeight: 18 },
  submitTime: { fontSize: 13, fontWeight: '700' },
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
  successWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  successText: { fontSize: 24, fontWeight: '800' },
});
