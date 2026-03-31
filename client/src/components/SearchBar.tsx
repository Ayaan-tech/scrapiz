import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  Dimensions,
  Image,
  Keyboard,
  ActivityIndicator,
  Platform
} from 'react-native';
import { Search, X, ChevronRight } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useHomeData } from '../hooks/useHomeData';
import { useScrapCategories } from '../hooks/useScrapCategories';
import { services } from '../app/(tabs)/services';
import { wp, hp, fs, spacing } from '../utils/responsive';
import { useTheme } from '../context/ThemeContext';
import { useLocalization } from '../context/LocalizationContext';
import { SafeAreaView } from 'react-native-safe-area-context';


interface SearchResult {
  id: string;
  name: string;
  description: string;
  category: string;
  categoryIcon: string;
  categoryColor: string;
  type: 'scrap' | 'service';
  image?: any;
  rate?: string;
}

export default function SearchBar() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { t } = useLocalization();
  
  // Backend data hooks
  const { products, categories, loading, error, refetch } = useHomeData();
  const scrapCategories = useScrapCategories(products, categories);
  
  // UI state
  const [isFocused, setIsFocused] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isNavigating, setIsNavigating] = useState(false);

  // Create category lookup map
  const categoryMap = useMemo(() => {
    const map = new Map();
    categories.forEach(cat => map.set(cat.id, cat));
    return map;
  }, [categories]);

  // Generate popular searches from scrapCategories
  const popularSearches = useMemo(() => {
    return scrapCategories.slice(0, 4).map(category => {
      // Remove common prefixes/suffixes for cleaner display labels
      const displayLabel = category.name
        .replace('Types of ', '')
        .replace(' Scrap', '')
        .trim();
      
      return {
        label: displayLabel,
        color: category.color,
        image: category.icon,
        category: category.name, // Keep full category name for navigation
      };
    });
  }, [scrapCategories]);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    
    if (query.trim().length === 0) {
      setSearchResults([]);
      return;
    }

    const results: SearchResult[] = [];
    const lowerQuery = query.toLowerCase();
    const addedIds = new Set<string>();
    
    // Search backend products
    products.forEach((product) => {
      const category = categoryMap.get(product.category);
      const itemId = `product-${product.id}`;
      
      if (!addedIds.has(itemId) &&
          (product.name.toLowerCase().includes(lowerQuery) ||
           product.description.toLowerCase().includes(lowerQuery) ||
           category?.name.toLowerCase().includes(lowerQuery))) {
        
        addedIds.add(itemId);
        results.push({
          id: itemId,
          name: product.name,
          description: product.description,
          category: category?.name || 'Unknown',
          categoryIcon: '📦',
          categoryColor: '#16a34a',
          type: 'scrap',
          rate: `₹${product.min_rate}-${product.max_rate}/${product.unit}`,
        });
      }
    });

    // Search services
    services.forEach((service) => {
      const serviceTitle = t(service.titleKey);
      const serviceDesc = t(service.descKey);
      const serviceId = `service-${service.id}`;
      
      if (!addedIds.has(serviceId) &&
          (serviceTitle.toLowerCase().includes(lowerQuery) ||
           serviceDesc.toLowerCase().includes(lowerQuery))) {
        addedIds.add(serviceId);
        results.push({
          id: serviceId,
          name: serviceTitle,
          description: serviceDesc,
          category: 'Services',
          categoryIcon: '🛠️',
          categoryColor: '#16a34a',
          type: 'service',
        });
      }
    });

    setSearchResults(results);
  }, [products, categoryMap]);

  const handleSelectResult = useCallback((result: SearchResult) => {
    if (isNavigating) return;
    
    setIsNavigating(true);
    Keyboard.dismiss();
    setIsFocused(false);
    setSearchQuery('');
    setSearchResults([]);
    
    if (result.type === 'service') {
      const serviceId = result.id.replace('service-', '');
      router.push(`/services/${serviceId}` as any);
    } else {
      router.push({
        pathname: '/(tabs)/sell',
        params: {
          preSelectedItem: result.name,
          preSelectedCategory: result.category,
        }
      } as any);
    }
    
    setTimeout(() => setIsNavigating(false), 1000);
  }, [isNavigating, router]);

  const handleClear = useCallback(() => {
    setSearchQuery('');
    setSearchResults([]);
  }, []);

  const handleCloseModal = useCallback(() => {
    Keyboard.dismiss();
    setIsFocused(false);
    setSearchQuery('');
    setSearchResults([]);
    setIsNavigating(false);
  }, []);

  const navigateToSellTab = useCallback((categoryName: string) => {
    if (isNavigating) return;
    setIsNavigating(true);
    Keyboard.dismiss();
    setIsFocused(false);
    setSearchQuery('');
    
    router.push({
      pathname: '/(tabs)/sell',
      params: {
        preSelectedCategory: categoryName,
      }
    } as any);
    
    setTimeout(() => setIsNavigating(false), 1000);
  }, [isNavigating, router]);

  return (
    <>
      {/* Search Input */}
      <TouchableOpacity
        style={styles.searchContainer}
        onPress={() => setIsFocused(true)}
        activeOpacity={0.85}
      >
        <View style={styles.searchIconContainer}>
          <Search size={18} color="#16a34a" strokeWidth={2.5} />
        </View>
        <Text style={styles.placeholderText}>Search scrap items & services...</Text>
      </TouchableOpacity>

      {/* Search Modal */}
      <Modal
        visible={isFocused}
        animationType="slide"
        transparent={true}
        onRequestClose={handleCloseModal}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface }}>
          {/* Search Header */}
          <View style={[styles.searchHeader, { borderBottomColor: colors.border, backgroundColor: colors.surface }]}>
            <View style={[styles.searchInputContainer, { backgroundColor: colors.card }]}>
              <Search size={20} color={colors.textSecondary} />
              <TextInput
                style={[styles.searchInput, { color: colors.text }]}
                placeholder="Search scrap items & services..."
                placeholderTextColor={colors.textTertiary}
                value={searchQuery}
                onChangeText={handleSearch}
                autoFocus
                returnKeyType="search"
                editable={!loading}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={handleClear} disabled={loading}>
                  <X size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleCloseModal}
            >
              <Text style={[styles.cancelText, { color: colors.primary }]}>Cancel</Text>
            </TouchableOpacity>
          </View>

          {/* Loading State */}
          {loading && (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="large" color="#16a34a" />
              <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading data...</Text>
            </View>
          )}

          {/* Error State */}
          {error && !loading && (
            <ScrollView style={styles.resultsContainer}>
              <View style={styles.errorContainer}>
                <Text style={[styles.errorText, { color: colors.text }]}>Failed to load scrap data</Text>
                <Text style={[styles.errorSubtext, { color: colors.textSecondary }]}>{error}</Text>
                <TouchableOpacity onPress={refetch} style={styles.retryButton}>
                  <Text style={styles.retryText}>Retry</Text>
                </TouchableOpacity>
              </View>

              {/* Services Section - Always functional during errors */}
              <Text style={[styles.sectionTitle, { color: isDark ? '#cbd5e1' : colors.textSecondary, marginTop: 24 }]}>
                Our Services
              </Text>
              {services.map((service) => (
                <TouchableOpacity
                  key={service.id}
                  style={[styles.serviceItem, { backgroundColor: colors.card, borderColor: colors.border }]}
                  onPress={() => {
                    if (isNavigating) return;
                    setIsNavigating(true);
                    Keyboard.dismiss();
                    setIsFocused(false);
                    router.push(`/services/${service.id}`);
                    setTimeout(() => setIsNavigating(false), 1000);
                  }}
                >
                  <View style={[styles.serviceIconContainer, { backgroundColor: isDark ? colors.primary + '20' : colors.primaryLight + '30', overflow: 'hidden' }]}>
                    <Image source={service.image} style={{ width: 34, height: 34, borderRadius: 6 }} resizeMode="cover" />
                  </View>
                  <View style={styles.serviceInfo}>
                    <Text style={[styles.serviceTitle, { color: isDark ? '#f1f5f9' : colors.text }]}>{service.title}</Text>
                    <Text style={[styles.serviceDescription, { color: isDark ? '#cbd5e1' : colors.textSecondary }]}>{t(service.descKey)}</Text>
                  </View>
                  <ChevronRight size={18} color={isDark ? colors.textSecondary : colors.textTertiary} strokeWidth={2} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {/* Content - Only show when not loading and no error */}
          {!loading && !error && (
            <ScrollView style={styles.resultsContainer}>
              {searchQuery.length === 0 ? (
                <View style={styles.popularContainer}>
                  {/* Handle empty data states gracefully */}
                  {scrapCategories.length === 0 ? (
                    <View style={styles.emptyStateContainer}>
                      <Text style={[styles.emptyStateText, { color: colors.text }]}>No categories available</Text>
                      <Text style={[styles.emptyStateSubtext, { color: colors.textSecondary }]}>
                        Check back later for scrap categories
                      </Text>
                    </View>
                  ) : (
                    <>
                      {/* Popular Searches */}
                      {popularSearches.length > 0 && (
                        <>
                          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Popular Searches</Text>
                          <View style={styles.popularGrid}>
                            {popularSearches.map((item, index) => (
                              <TouchableOpacity
                                key={index}
                                style={[
                                  styles.popularChip,
                                  { backgroundColor: colors.card, borderColor: item.color + '40' },
                                ]}
                                onPress={() => navigateToSellTab(item.category)}
                              >
                                <Image
                                  source={item.image}
                                  style={styles.popularImage}
                                  resizeMode="cover"
                                />
                                <Text style={[styles.popularLabel, { color: colors.text }]}>{item.label}</Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                        </>
                      )}

                      {/* Browse Categories */}
                      <Text style={[styles.sectionTitle, { color: colors.textSecondary, marginTop: 24 }]}>
                        Browse Categories
                      </Text>
                      {scrapCategories.map((category) => (
                        <TouchableOpacity
                          key={category.id}
                          style={[styles.categoryItem, { backgroundColor: colors.card }]}
                          onPress={() => navigateToSellTab(category.name)}
                        >
                          <Image
                            source={category.icon}
                            style={styles.categoryImage}
                            resizeMode="cover"
                          />
                          <View style={styles.categoryInfo}>
                            <Text style={[styles.categoryTitle, { color: colors.text }]}>{category.name}</Text>
                            <Text style={[styles.categoryCount, { color: colors.textSecondary }]}>
                              {category.products.length} items
                            </Text>
                          </View>
                          <ChevronRight size={18} color={colors.textTertiary} strokeWidth={2} />
                        </TouchableOpacity>
                      ))}
                    </>
                  )}

                  {/* Services Section - Always visible */}
                  <Text style={[styles.sectionTitle, { color: isDark ? '#cbd5e1' : colors.textSecondary, marginTop: 24 }]}>
                    Our Services
                  </Text>
                  {services.map((service) => (
                    <TouchableOpacity
                      key={service.id}
                      style={[styles.serviceItem, { backgroundColor: colors.card, borderColor: colors.border }]}
                      onPress={() => {
                        if (isNavigating) return;
                        setIsNavigating(true);
                        Keyboard.dismiss();
                        setIsFocused(false);
                        router.push(`/services/${service.id}`);
                        setTimeout(() => setIsNavigating(false), 1000);
                      }}
                    >
                      <View style={[styles.serviceIconContainer, { backgroundColor: isDark ? colors.primary + '20' : colors.primaryLight + '30', overflow: 'hidden' }]}>
                        <Image source={service.image} style={{ width: 34, height: 34, borderRadius: 6 }} resizeMode="cover" />
                      </View>
                      <View style={styles.serviceInfo}>
                        <Text style={[styles.serviceTitle, { color: isDark ? '#f1f5f9' : colors.text }]}>{service.title}</Text>
                        <Text style={[styles.serviceDescription, { color: isDark ? '#cbd5e1' : colors.textSecondary }]}>{t(service.descKey)}</Text>
                      </View>
                      <ChevronRight size={18} color={isDark ? colors.textSecondary : colors.textTertiary} strokeWidth={2} />
                    </TouchableOpacity>
                  ))}
                </View>
              ) : searchResults.length > 0 ? (
                /* Search Results */
                <View style={styles.resultsContent}>
                  <Text style={[styles.resultsCount, { color: colors.textSecondary }]}>
                    {searchResults.length} result{searchResults.length !== 1 ? 's' : ''}{' '}
                    found
                  </Text>
                  {searchResults.map((result) => (
                    <TouchableOpacity
                      key={result.id}
                      style={[styles.resultItem, { backgroundColor: colors.card }]}
                      onPress={() => handleSelectResult(result)}
                    >
                      {result.type === 'scrap' && result.image ? (
                        <Image
                          source={result.image}
                          style={styles.resultImage}
                          resizeMode="cover"
                        />
                      ) : (
                        <View
                          style={[
                            styles.resultIcon,
                            { backgroundColor: result.categoryColor + '20' },
                          ]}
                        >
                          <Text style={styles.resultEmoji}>
                            {result.categoryIcon}
                          </Text>
                        </View>
                      )}
                      <View style={styles.resultInfo}>
                        <Text style={[styles.resultName, { color: colors.text }]}>{result.name}</Text>
                        <Text style={[styles.resultDescription, { color: colors.textSecondary }]}>
                          {result.description}
                        </Text>
                        {result.rate && (
                          <Text style={[styles.resultRate, { color: colors.primary }]}>{result.rate}</Text>
                        )}
                        <Text
                          style={[
                            styles.resultCategory,
                            { color: result.categoryColor },
                          ]}
                        >
                          {result.category}
                        </Text>
                      </View>
                      <ChevronRight size={18} color={colors.textTertiary} strokeWidth={2} />
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
                /* No Results */
                <View style={styles.noResults}>
                  <Text style={styles.noResultsEmoji}>🔍</Text>
                  <Text style={[styles.noResultsText, { color: colors.text }]}>No results found</Text>
                  <Text style={[styles.noResultsSubtext, { color: colors.textSecondary }]}>
                    Try searching for paper, plastic, metal, electronics, or services
                  </Text>
                </View>
              )}
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>
    </>
  );
}
const styles = StyleSheet.create({
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    borderRadius: 12,
    paddingHorizontal: spacing(14),
    paddingVertical: spacing(12),
    gap: spacing(10),
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  searchIconContainer: {
    width: wp(8.5),
    height: wp(8.5),
    backgroundColor: '#ecfdf5',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(22, 163, 74, 0.2)',
  },
  placeholderText: {
    fontSize: fs(13),
    color: '#6b7280',
    flex: 1,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    // Removed specific padding here, handled by SafeAreaView and Header padding
  },
  
  // FIXED HEADER: Increased Padding for Danger Zone
  searchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing(16),
    // Drastically increased top padding to avoid status bar overlap
    paddingTop: Platform.OS === 'ios' ? spacing(20) : spacing(40), 
    paddingBottom: spacing(12),
    borderBottomWidth: 1,
    gap: spacing(12),
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10, // Slightly sharper corners
    paddingHorizontal: spacing(12),
    paddingVertical: Platform.OS === 'android' ? spacing(6) : spacing(10), // Reduced height
    gap: spacing(8),
    height: spacing(40), // Fixed compact height
  },
  searchInput: {
    flex: 1,
    fontSize: fs(14),
    paddingVertical: 0,
  },
  cancelButton: {
    paddingHorizontal: spacing(4),
  },
  cancelText: {
    fontSize: fs(14),
    fontWeight: '600',
  },
  resultsContainer: {
    flex: 1,
  },
  popularContainer: {
    padding: spacing(16), // Reduced outer padding
  },
  sectionTitle: {
    fontSize: fs(12), // Reduced font size
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing(10),
    opacity: 0.9,
  },
  
  // COMPACTED POPULAR GRID
  popularGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: spacing(8),
    marginBottom: spacing(4),
  },
  popularChip: {
    width: '48%',
    flexDirection: 'row', // Changed to row for compactness (optional, or keep col)
    alignItems: 'center',
    paddingHorizontal: spacing(10),
    paddingVertical: spacing(10), // Reduced padding
    borderRadius: 10,
    borderWidth: 1,
    gap: spacing(8),
    minHeight: hp(8), // Reduced height
  },
  popularImage: {
    width: wp(10), // Reduced size
    height: wp(10),
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
  },
  popularLabel: {
    fontSize: fs(12), // Reduced font
    fontWeight: '600',
    flex: 1,
  },

  // COMPACTED CATEGORIES
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing(10), // Reduced padding
    borderRadius: 10,
    marginBottom: spacing(8),
    gap: spacing(10),
  },
  categoryImage: {
    width: wp(11), // Reduced size
    height: wp(11),
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
  },
  categoryInfo: {
    flex: 1,
  },
  categoryTitle: {
    fontSize: fs(14),
    fontWeight: '600',
    marginBottom: spacing(2),
  },
  categoryCount: {
    fontSize: fs(12),
  },

  // COMPACTED SERVICES
  serviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing(12), // Reduced padding
    borderRadius: 10,
    marginBottom: spacing(8),
    gap: spacing(10),
    borderWidth: 1,
    shadowOpacity: 0.03, // Subtler shadow
  },
  serviceIconContainer: {
    width: wp(9), // Reduced size
    height: wp(9),
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(22, 163, 74, 0.2)',
  },
  serviceInfo: {
    flex: 1,
  },
  serviceTitle: {
    fontSize: fs(14),
    fontWeight: '600',
    marginBottom: spacing(2),
  },
  serviceDescription: {
    fontSize: fs(12),
    opacity: 0.8,
  },

  // COMPACTED SEARCH RESULTS
  resultsContent: {
    padding: spacing(16),
  },
  resultsCount: {
    fontSize: fs(13),
    fontWeight: '500',
    marginBottom: spacing(12),
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center', // Align center vertically
    padding: spacing(10), // Reduced
    borderRadius: 10,
    marginBottom: spacing(8),
    gap: spacing(10),
  },
  resultIcon: {
    width: wp(10),
    height: wp(10),
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultEmoji: {
    fontSize: fs(20),
  },
  resultInfo: {
    flex: 1,
  },
  resultName: {
    fontSize: fs(14),
    fontWeight: '600',
    marginBottom: spacing(2),
  },
  resultDescription: {
    fontSize: fs(12),
    marginBottom: spacing(2),
  },
  resultRate: {
    fontSize: fs(12),
    fontWeight: '600',
  },
  resultImage: {
    width: wp(12),
    height: wp(12),
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
  },
  
  // UTILS
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing(20),
  },
  loadingText: {
    marginTop: spacing(8),
    fontSize: fs(13),
  },
  errorContainer: {
    alignItems: 'center',
    padding: spacing(20),
  },
  errorText: {
    fontSize: fs(14),
    marginBottom: spacing(8),
  },
  retryButton: {
    backgroundColor: '#16a34a',
    paddingHorizontal: spacing(16),
    paddingVertical: spacing(8),
    borderRadius: 8,
  },
  retryText: {
    color: 'white',
    fontSize: fs(12),
    fontWeight: '600',
  },
  noResults: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: hp(8),
  },
  noResultsEmoji: {
    fontSize: fs(40),
    marginBottom: spacing(12),
  },
  noResultsText: {
    fontSize: fs(16),
    fontWeight: '600',
  },
});