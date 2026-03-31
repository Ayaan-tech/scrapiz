import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Check, ChevronDown, Package } from 'lucide-react-native';
import { Picker } from '@react-native-picker/picker';
import { AuthService, ServiceBookingPayload } from '../../api/apiService';
import { useTheme } from '../../context/ThemeContext';

type Step = 1 | 2 | 3;

const SERVICES = [
  {
    id: 'e_waste_collection',
    title: 'E-waste collection',
    subtitle: 'Laptops, phones, servers,\nprinters - certificate disposal\nwith CPCB-compliant certificate.',
    tag: 'Core service - Always included',
    image: require('../../../assets/images/services/corporate_tieup/e_waste_Coollection.webp'),
  },
  {
    id: 'confidential_shredding',
    title: 'Confidential paper shredding',
    subtitle: 'HR records, legal & financial\ndocs destroyed with data\ndestruction certificate.',
    tag: 'Data security SLA',
    image: require('../../../assets/images/services/corporate_tieup/confidential_paper_shredding.webp'),
  },
  {
    id: 'dry_waste_pickup',
    title: 'Dry waste pickup',
    subtitle: 'Cardboard packaging, plastic,\noffice paper - regular scheduled\ncollection.',
    tag: 'Scheduled',
    image: require('../../../assets/images/services/corporate_tieup/dry_waste_pickup.webp'),
  },
  {
    id: 'office_furniture_removal',
    title: 'Office furniture removal',
    subtitle: 'Old desks, chairs, workstations -\nideal during relocation or\nrenovation.',
    tag: 'On request',
    image: require('../../../assets/images/services/corporate_tieup/office_furniture_removal.webp'),
  },
  {
    id: 'metal_scrap_collection',
    title: 'Metal & scrap collection',
    subtitle: 'Old equipment, cables, server\nracks, UPS batteries.',
    tag: 'Asset recovery',
    image: require('../../../assets/images/services/corporate_tieup/metal_scrap_collection.webp'),
  },
];

const INDUSTRIES = [
  { id: 'it_tech', title: 'IT / Tech', image: require('../../../assets/images/services/corporate_tieup/it_tech.webp') },
  { id: 'bfsi', title: 'BFSI', image: require('../../../assets/images/services/corporate_tieup/bfsi.webp') },
  { id: 'manufacturing', title: 'Manufacturing', image: require('../../../assets/images/services/corporate_tieup/manufacturing.webp') },
  { id: 'healthcare', title: 'Healthcare', image: require('../../../assets/images/services/corporate_tieup/healthcare.webp') },
  { id: 'retail', title: 'Retail', image: require('../../../assets/images/services/corporate_tieup/retail.webp') },
  { id: 'other', title: 'Other' },
];

export default function CorporateTieupBookScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();

  const ui = useMemo(
    () => ({
      bg: isDark ? '#101526' : '#FFFFFF',
      surface: isDark ? '#171E33' : '#FFFFFF',
      border: isDark ? '#36405C' : '#D9D9D9',
      title: isDark ? '#F7F8FA' : '#121212',
      muted: isDark ? '#AAB2C0' : '#787878',
      primary: '#184A9B',
      primarySoft: isDark ? 'rgba(24,74,155,0.22)' : '#E4F5FF',
      summary: isDark ? '#1C2438' : '#EFEFF2',
      submitCard: isDark ? '#16253B' : '#E4F5FF',
      submitBorder: isDark ? '#3E7BD8' : '#7ED0FF',
    }),
    [isDark]
  );

  const [step, setStep] = useState<Step>(1);
  const [selectedServices, setSelectedServices] = useState<string[]>([
    'e_waste_collection',
    'confidential_shredding',
    'dry_waste_pickup',
  ]);
  const [frequency, setFrequency] = useState('Bi-weekly');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [workEmail, setWorkEmail] = useState('');
  const [role, setRole] = useState('Team Lead');
  const [industryType, setIndustryType] = useState('it_tech');
  const [companyName, setCompanyName] = useState('');
  const [city, setCity] = useState('Mumbai');
  const [officeFloors, setOfficeFloors] = useState('4 - 6');
  const [employeeCount, setEmployeeCount] = useState('50 - 200');
  const [officeAddress, setOfficeAddress] = useState('');
  const [multipleLocations, setMultipleLocations] = useState(true);
  const [numberOfLocations, setNumberOfLocations] = useState('2');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const user = await AuthService.getUser();
        setName(user.name || '');
        setPhone(user.phone_number || '');
      } catch (error) {
        console.error(error);
      }
    })();
  }, []);

  const canStep2 = selectedServices.length > 0 && frequency.length > 0;
  const canStep3 =
    name.trim() &&
    phone.trim() &&
    workEmail.trim() &&
    role &&
    industryType &&
    companyName.trim() &&
    city &&
    officeFloors &&
    employeeCount &&
    officeAddress.trim() &&
    numberOfLocations;

  const submitEnquiry = async () => {
    try {
      setSubmitting(true);
      const payload: ServiceBookingPayload = {
        service: 'paper-shredding',
        name: name.trim(),
        phone: phone.trim(),
        address: officeAddress.trim(),
        preferredDateTime: new Date().toISOString(),
        service_details: {
          service_type: 'corporate_tieup',
          services_selected: selectedServices,
          pickup_frequency: frequency,
          work_email: workEmail.trim(),
          role,
          industry_type: industryType,
          company_name: companyName.trim(),
          city,
          office_floors: officeFloors,
          employee_count: employeeCount,
          office_address: officeAddress.trim(),
          multiple_locations: multipleLocations,
          number_of_locations: numberOfLocations,
        },
      };
      await AuthService.createServiceBooking(payload);
      Alert.alert('Enquiry Submitted', 'Your corporate tie-up enquiry has been scheduled successfully.');
      router.replace('/(tabs)/services');
    } catch (error: any) {
      Alert.alert('Enquiry Failed', error?.message || 'Unable to submit corporate enquiry');
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
      <Text style={[styles.sectionEyebrow, { color: ui.muted }]}>WHAT DOES YOUR OFFICE NEED?</Text>
      {SERVICES.map((item) => {
        const active = selectedServices.includes(item.id);
        return (
          <TouchableOpacity
            key={item.id}
            style={[
              styles.serviceCard,
              { backgroundColor: active ? ui.primarySoft : ui.surface, borderColor: active ? '#7ED0FF' : ui.border },
            ]}
            onPress={() =>
              setSelectedServices((current) =>
                current.includes(item.id) ? current.filter((value) => value !== item.id) : [...current, item.id]
              )
            }
          >
            <Image source={item.image} style={styles.serviceImage} />
            <View style={styles.serviceText}>
              <Text style={[styles.serviceTitle, { color: ui.title }]}>{item.title}</Text>
              <Text style={[styles.serviceSubtitle, { color: ui.muted }]}>{item.subtitle}</Text>
              <View style={styles.serviceTag}>
                <Text style={[styles.serviceTagText, { color: item.id === 'confidential_shredding' ? '#C03B3B' : '#2C993A' }]}>{item.tag}</Text>
              </View>
            </View>
            <View style={[styles.checkCircle, { borderColor: active ? ui.primary : ui.border, backgroundColor: active ? ui.primary : 'transparent' }]}>
              {active && <Check size={16} color="#fff" />}
            </View>
          </TouchableOpacity>
        );
      })}

      <Text style={[styles.sectionEyebrow, { color: ui.muted, marginTop: 22 }]}>PICKUP FREQUENCY NEEDED</Text>
      <View style={styles.frequencyRow}>
        {['Weekly', 'Bi-weekly', 'Monthly', 'On-demand'].map((item) => {
          const active = frequency === item;
          return (
            <TouchableOpacity
              key={item}
              style={[styles.frequencyChip, { backgroundColor: active ? ui.primarySoft : ui.surface, borderColor: active ? '#7ED0FF' : ui.border }]}
              onPress={() => setFrequency(item)}
            >
              <Text style={[styles.frequencyText, { color: active ? ui.primary : ui.muted }]}>{item}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.slaCard}>
        <Text style={styles.slaTitle}>Data destruction SLA included</Text>
        <Text style={styles.slaBody}>
          Since you selected confidential shredding, your proposal will include a formal data destruction SLA with
          witnessed certificate.
        </Text>
        <Text style={styles.slaFooter}>ISO 27001 compliant</Text>
      </View>
    </>
  );

  const renderStep2 = () => (
    <>
      <Text style={[styles.sectionEyebrow, { color: ui.muted }]}>CORPORATE DETAILS</Text>
      <Text style={[styles.sectionHeading, { color: ui.title }]}>Contact Details</Text>
      <View style={[styles.inputBox, { backgroundColor: ui.surface, borderColor: ui.border }]}>
        <TextInput value={name} onChangeText={setName} placeholder="Enter your Full Name" placeholderTextColor={ui.muted} style={[styles.input, { color: ui.title }]} />
      </View>
      <View style={[styles.inputBox, { backgroundColor: ui.surface, borderColor: ui.border }]}>
        <TextInput value={phone} onChangeText={setPhone} placeholder="Enter your phone number" placeholderTextColor={ui.muted} keyboardType="phone-pad" style={[styles.input, { color: ui.title }]} />
      </View>
      <View style={[styles.inputBox, { backgroundColor: ui.surface, borderColor: ui.border }]}>
        <TextInput value={workEmail} onChangeText={setWorkEmail} placeholder="Enter your work email" placeholderTextColor={ui.muted} keyboardType="email-address" autoCapitalize="none" style={[styles.input, { color: ui.title }]} />
      </View>
      <View style={[styles.selectBox, { backgroundColor: ui.surface, borderColor: ui.border }]}>
        <Picker selectedValue={role} onValueChange={setRole} style={{ color: ui.title }} dropdownIconColor={ui.muted}>
          <Picker.Item label="Team Lead" value="Team Lead" />
          <Picker.Item label="Engineering Manager" value="Engineering Manager" />
          <Picker.Item label="HR" value="HR" />
          <Picker.Item label="CTO" value="CTO" />
          <Picker.Item label="CEO" value="CEO" />
          <Picker.Item label="Operations Lead" value="Operations Lead" />
          <Picker.Item label="Other" value="Other" />
        </Picker>
        <ChevronDown size={18} color={ui.muted} style={styles.selectChevron} />
      </View>

      <Text style={[styles.sectionHeading, { color: ui.title }]}>Industry Type</Text>
      <View style={styles.societyGrid}>
        {INDUSTRIES.map((item) => {
          const active = industryType === item.id;
          return (
            <TouchableOpacity
              key={item.id}
              style={[styles.societyCard, { backgroundColor: active ? ui.primarySoft : ui.surface, borderColor: active ? '#7ED0FF' : ui.border }]}
              onPress={() => setIndustryType(item.id)}
            >
              {item.image ? (
                <Image source={item.image} style={styles.societyImage} />
              ) : (
                <View style={styles.otherCardIcon}>
                  <Package size={42} color="#C69742" />
                </View>
              )}
              <Text style={[styles.societyTitle, { color: ui.title }]}>{item.title}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={[styles.sectionHeading, { color: ui.title }]}>Company Name</Text>
      <View style={[styles.inputBox, { backgroundColor: ui.surface, borderColor: ui.border }]}>
        <TextInput value={companyName} onChangeText={setCompanyName} placeholder="e.g. Acme Technologies Pvt. Ltd." placeholderTextColor={ui.muted} style={[styles.input, { color: ui.title }]} />
      </View>

      <View style={styles.twoColRow}>
        <View style={styles.halfCol}>
          <Text style={[styles.sectionHeading, { color: ui.title }]}>City</Text>
          <View style={[styles.selectBox, { backgroundColor: ui.surface, borderColor: ui.border }]}>
            <Picker selectedValue={city} onValueChange={setCity} style={{ color: ui.title }} dropdownIconColor={ui.muted}>
              <Picker.Item label="Mumbai" value="Mumbai" />
              <Picker.Item label="Pune" value="Pune" />
              <Picker.Item label="Bengaluru" value="Bengaluru" />
              <Picker.Item label="Delhi NCR" value="Delhi NCR" />
            </Picker>
            <ChevronDown size={18} color={ui.muted} style={styles.selectChevron} />
          </View>
        </View>
        <View style={styles.halfCol}>
          <Text style={[styles.sectionHeading, { color: ui.title }]}>Office Floors</Text>
          <View style={[styles.selectBox, { backgroundColor: ui.surface, borderColor: ui.border }]}>
            <Picker selectedValue={officeFloors} onValueChange={setOfficeFloors} style={{ color: ui.title }} dropdownIconColor={ui.muted}>
              <Picker.Item label="1 - 3" value="1 - 3" />
              <Picker.Item label="4 - 6" value="4 - 6" />
              <Picker.Item label="7 - 10" value="7 - 10" />
              <Picker.Item label="10+" value="10+" />
            </Picker>
            <ChevronDown size={18} color={ui.muted} style={styles.selectChevron} />
          </View>
        </View>
      </View>

      <Text style={[styles.sectionHeading, { color: ui.title }]}>Employee Count</Text>
      <View style={styles.wasteRow}>
        {['<50', '50 - 200', '200 - 500', '500+'].map((item) => {
          const active = employeeCount === item;
          return (
            <TouchableOpacity key={item} style={[styles.wasteChip, { backgroundColor: active ? ui.primarySoft : ui.surface, borderColor: active ? '#7ED0FF' : ui.border }]} onPress={() => setEmployeeCount(item)}>
              <Text style={[styles.wasteText, { color: active ? ui.primary : ui.muted }]}>{item}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={[styles.sectionHeading, { color: ui.title }]}>Office Address</Text>
      <View style={[styles.inputBox, styles.addressInput, { backgroundColor: ui.surface, borderColor: ui.border }]}>
        <TextInput value={officeAddress} onChangeText={setOfficeAddress} placeholder="Enter office address" placeholderTextColor={ui.muted} multiline style={[styles.textAreaInput, { color: ui.title }]} />
      </View>

      <Text style={[styles.sectionHeading, { color: ui.title }]}>Office Locations</Text>
      <TouchableOpacity style={[styles.locationCard, { backgroundColor: multipleLocations ? ui.primarySoft : ui.surface, borderColor: multipleLocations ? '#7ED0FF' : ui.border }]} onPress={() => setMultipleLocations((current) => !current)}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.locationTitle, { color: ui.title }]}>Multiple office locations</Text>
          <Text style={[styles.locationDesc, { color: ui.muted }]}>Branches / campuses in the same city</Text>
        </View>
        <View style={[styles.checkCircle, { borderColor: multipleLocations ? ui.primary : ui.border, backgroundColor: multipleLocations ? ui.primary : 'transparent' }]}>
          {multipleLocations && <Check size={16} color="#fff" />}
        </View>
      </TouchableOpacity>

      <Text style={[styles.sectionHeading, { color: ui.title }]}>Number of Locations</Text>
      <View style={styles.wasteRow}>
        {['1', '2', '3', '4+'].map((item) => {
          const active = numberOfLocations === item;
          return (
            <TouchableOpacity key={item} style={[styles.wasteChip, { backgroundColor: active ? ui.primarySoft : ui.surface, borderColor: active ? '#7ED0FF' : ui.border }]} onPress={() => setNumberOfLocations(item)}>
              <Text style={[styles.wasteText, { color: active ? ui.primary : ui.muted }]}>{item}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={[styles.infoCard, { backgroundColor: ui.primarySoft }]}>
        <Text style={[styles.infoText, { color: ui.muted }]}>
          Each location will get its own pickup schedule. All under one account & one monthly invoice.
        </Text>
      </View>
    </>
  );

  const renderStep3 = () => (
    <>
      <Text style={[styles.sectionEyebrow, { color: ui.muted }]}>REVIEW SUMMARY</Text>
      <View style={[styles.summaryCard, { backgroundColor: ui.summary }]}>
        <View style={styles.summaryHeader}>
          <Text style={[styles.summaryTitle, { color: ui.title }]}>Corporate details</Text>
          <Text style={[styles.editText, { color: ui.primary }]}>Edit</Text>
        </View>
        {[
          ['Company', companyName || 'N/A'],
          ['Location', officeAddress || 'N/A'],
          ['Industry', INDUSTRIES.find((item) => item.id === industryType)?.title || 'N/A'],
          ['Office floors', officeFloors],
          ['Employees', employeeCount],
        ].map(([label, value], index) => (
          <View key={label}>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: ui.muted }]}>{label}</Text>
              <Text style={[styles.summaryValue, { color: ui.title }]}>{value}</Text>
            </View>
            {index < 4 && <View style={styles.summaryDivider} />}
          </View>
        ))}
      </View>

      <View style={[styles.summaryCard, { backgroundColor: ui.summary }]}>
        <View style={styles.summaryHeader}>
          <Text style={[styles.summaryTitle, { color: ui.title }]}>Services selected</Text>
          <Text style={[styles.editText, { color: ui.primary }]}>Edit</Text>
        </View>
        <View style={styles.selectedServicesWrap}>
          {selectedServices.map((id) => {
            const item = SERVICES.find((service) => service.id === id);
            return (
              <View key={id} style={styles.selectedPill}>
                <Text style={[styles.selectedPillText, { color: ui.primary }]}>{item?.title || id}</Text>
              </View>
            );
          })}
        </View>
        <Text style={[styles.frequencySummary, { color: ui.muted }]}>Frequency: {frequency}</Text>
      </View>

      <View style={[styles.submitCard, { backgroundColor: ui.submitCard, borderColor: ui.submitBorder }]}>
        <Text style={[styles.submitTitle, { color: ui.primary }]}>What happens after you submit</Text>
        {[
          ['1', 'Our team calls you within\n24 hours.', '24 hrs'],
          ['2', 'Free audit call & custom\nproposal sent.', '2 - 3 days'],
          ['3', 'Agreement signed, first\npickup scheduled.', '~ 1 weeks'],
        ].map(([stepNo, text, time]) => (
          <View key={stepNo} style={styles.submitRow}>
            <View style={styles.submitStep}>
              <Text style={[styles.submitStepText, { color: ui.primary }]}>{stepNo}</Text>
            </View>
            <Text style={[styles.submitDesc, { color: ui.primary }]}>{text}</Text>
            <Text style={[styles.submitTime, { color: '#7EC8F7' }]}>{time}</Text>
          </View>
        ))}
      </View>
    </>
  );

  return (
    <View style={[styles.screen, { backgroundColor: ui.bg, paddingTop: insets.top }]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.header, { borderBottomColor: ui.border }]}>
          <TouchableOpacity style={styles.backButton} onPress={() => (step > 1 ? setStep((current) => (current - 1) as Step) : router.back())}>
            <ArrowLeft size={26} color={ui.muted} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: ui.title }]}>Corporate Tie - Up</Text>
        </View>
        {renderProgress()}

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}

          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: ui.primary, opacity: step === 1 ? (canStep2 ? 1 : 0.5) : step === 2 ? (canStep3 ? 1 : 0.5) : 1 }]}
            onPress={() => {
              if (step === 1) {
                if (!canStep2) {
                  Alert.alert('Selection needed', 'Please choose at least one service and pickup frequency.');
                  return;
                }
                setStep(2);
                return;
              }
              if (step === 2) {
                if (!canStep3) {
                  Alert.alert('Complete details', 'Please fill all the corporate details before continuing.');
                  return;
                }
                setStep(3);
                return;
              }
              submitEnquiry();
            }}
            disabled={submitting}
          >
            <Text style={styles.primaryButtonText}>{step === 3 ? (submitting ? 'Submitting...' : 'Schedule Enquiry') : 'Continue'}</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { height: 76, justifyContent: 'center', alignItems: 'center', borderBottomWidth: 1, position: 'relative' },
  backButton: { position: 'absolute', left: 14, top: 22, padding: 8 },
  headerTitle: { fontSize: 24, fontWeight: '800' },
  progressWrap: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18, paddingVertical: 18 },
  progressItem: { flexDirection: 'row', alignItems: 'center' },
  progressDot: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  progressText: { fontSize: 16, fontWeight: '800' },
  progressLine: { width: 128, height: 2 },
  content: { paddingHorizontal: 16, paddingBottom: 32 },
  sectionEyebrow: { fontSize: 18, fontWeight: '800', marginBottom: 12 },
  sectionHeading: { fontSize: 16, fontWeight: '800', marginBottom: 8, marginTop: 8 },
  serviceCard: { borderWidth: 1, borderRadius: 16, padding: 8, flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  serviceImage: { width: 58, height: 58, borderRadius: 10, marginRight: 12 },
  serviceText: { flex: 1 },
  serviceTitle: { fontSize: 16, fontWeight: '800', marginBottom: 4 },
  serviceSubtitle: { fontSize: 13, lineHeight: 17, fontWeight: '600' },
  serviceTag: { alignSelf: 'flex-start', borderRadius: 999, borderWidth: 1, borderColor: '#82CF8D', paddingHorizontal: 10, paddingVertical: 3, marginTop: 6 },
  serviceTagText: { fontSize: 12, fontWeight: '700' },
  checkCircle: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginLeft: 12 },
  frequencyRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  frequencyChip: { minWidth: 90, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, alignItems: 'center' },
  frequencyText: { fontSize: 14, fontWeight: '700' },
  slaCard: { backgroundColor: '#10244B', borderRadius: 22, padding: 18, marginTop: 18 },
  slaTitle: { color: '#FFFFFF', fontSize: 20, lineHeight: 22, fontWeight: '900', marginBottom: 6 },
  slaBody: { color: '#C9D7F4', fontSize: 15, lineHeight: 19, fontStyle: 'italic', marginBottom: 10 },
  slaFooter: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  inputBox: { borderWidth: 1, borderRadius: 14, marginBottom: 10 },
  input: { paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, fontWeight: '600' },
  selectBox: { borderWidth: 1, borderRadius: 14, marginBottom: 12, overflow: 'hidden', position: 'relative' },
  selectChevron: { position: 'absolute', right: 16, top: 18 },
  societyGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12, marginBottom: 6 },
  societyCard: { width: '48%', borderWidth: 1, borderRadius: 16, paddingVertical: 10, paddingHorizontal: 10, alignItems: 'center' },
  societyImage: { width: 94, height: 72, borderRadius: 10, marginBottom: 8 },
  otherCardIcon: { width: 94, height: 72, borderRadius: 10, marginBottom: 8, backgroundColor: '#F3E7D1', alignItems: 'center', justifyContent: 'center' },
  societyTitle: { fontSize: 16, fontWeight: '800', textAlign: 'center' },
  twoColRow: { flexDirection: 'row', justifyContent: 'space-between' },
  halfCol: { width: '48%' },
  wasteRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 6 },
  wasteChip: { minWidth: 82, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, alignItems: 'center' },
  wasteText: { fontSize: 14, fontWeight: '700' },
  addressInput: { minHeight: 92 },
  textAreaInput: { paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, fontWeight: '600', minHeight: 92, textAlignVertical: 'top' },
  locationCard: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  locationTitle: { fontSize: 17, fontWeight: '800' },
  locationDesc: { fontSize: 14, fontWeight: '600' },
  infoCard: { borderRadius: 14, paddingHorizontal: 16, paddingVertical: 16, marginTop: 8 },
  infoText: { fontSize: 14, lineHeight: 18, fontWeight: '600' },
  summaryCard: { borderRadius: 22, padding: 16, marginBottom: 16 },
  summaryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  summaryTitle: { fontSize: 18, fontWeight: '800' },
  editText: { fontSize: 16, fontWeight: '800' },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  summaryLabel: { flex: 1, fontSize: 15, fontWeight: '600' },
  summaryValue: { flex: 1, fontSize: 15, fontWeight: '700', textAlign: 'right' },
  summaryDivider: { height: 1, backgroundColor: '#D4D4D8' },
  selectedServicesWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  selectedPill: { borderRadius: 999, borderWidth: 1, borderColor: '#7ED0FF', backgroundColor: '#EAF5FF', paddingHorizontal: 12, paddingVertical: 5 },
  selectedPillText: { fontSize: 14, fontWeight: '700' },
  frequencySummary: { fontSize: 15, fontWeight: '600' },
  submitCard: { borderRadius: 22, borderWidth: 1, padding: 16, marginBottom: 18 },
  submitTitle: { fontSize: 18, fontWeight: '800', marginBottom: 12 },
  submitRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  submitStep: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#B6E6FF', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  submitStepText: { fontSize: 14, fontWeight: '800' },
  submitDesc: { flex: 1, fontSize: 15, lineHeight: 19, fontWeight: '700' },
  submitTime: { fontSize: 14, fontWeight: '700', marginLeft: 10 },
  primaryButton: { borderRadius: 14, height: 54, alignItems: 'center', justifyContent: 'center', marginTop: 6 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 18, fontWeight: '800' },
});
