import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthService } from '../api/apiService';
import { ReferredUser, ReferralTransaction } from '../types/referral';

interface ReferralContextType {
  // Data
  referralCode: string | null;
  referralBalance: number;
  pendingBalance: number;
  totalReferrals: number;
  successfulReferrals: number;
  referredUsers: ReferredUser[];
  transactions: ReferralTransaction[];
  hasUsedReferralCode: boolean;
  
  // Loading states
  isLoading: boolean;
  isRefreshing: boolean;
  
  // Error state
  error: string | null;
  
  // Methods
  fetchReferralData: () => Promise<void>;
  refreshReferralData: () => Promise<void>;
  clearError: () => void;
  updateBalanceAndCache: (newBalance: number) => Promise<void>;
  applyReferralCode: (code: string) => Promise<void>;
  
  // Utility
  canRedeem: boolean;
  shareMessage: string;
  
  // Legacy compatibility
  walletBalance: number;
  setWalletBalance: (balance: number) => void;
  setTotalReferrals: (count: number) => void;
  setSuccessfulReferrals: (count: number) => void;
  applyReferralDiscount: (amount: number) => number;
}

const ReferralContext = createContext<ReferralContextType | undefined>(undefined);

export function ReferralProvider({children}:{children: ReactNode}){
    // State
    const [referralCode, setReferralCode] = useState<string | null>(null);
    const [referralBalance, setReferralBalance] = useState(0);
    const [pendingBalance, setPendingBalance] = useState(0);
    const [totalReferrals, setTotalReferrals] = useState(0);
    const [successfulReferrals, setSuccessfulReferrals] = useState(0);
    const [referredUsers, setReferredUsers] = useState<ReferredUser[]>([]);
    const [transactions, setTransactions] = useState<ReferralTransaction[]>([]);
    const [hasUsedReferralCode, setHasUsedReferralCode] = useState(false);
    
    const [isLoading, setIsLoading] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Get user-specific cache key
    const getCacheKey = async () => {
        try {
            const userProfile = await AuthService.getUser();
            return `referral_cache_${userProfile.id}`;
        } catch {
            return 'referral_cache'; // Fallback to generic key
        }
    };

    // Load cached data from AsyncStorage
    const loadCachedData = async () => {
        try {
            const cacheKey = await getCacheKey();
            const cached = await AsyncStorage.getItem(cacheKey);
            if (cached) {
                const data = JSON.parse(cached);
                setReferralCode(data.referralCode || null);
                setReferralBalance(data.referralBalance || 0);
                setPendingBalance(data.pendingBalance || 0);
                setTotalReferrals(data.totalReferrals || 0);
                setSuccessfulReferrals(data.successfulReferrals || 0);
                setReferredUsers(data.referredUsers || []);
                setTransactions(data.transactions || []);
            }
        } catch (error) {
            console.error('Failed to load cached referral data:', error);
        }
    };

    // Cache referral data to AsyncStorage
    const cacheReferralData = async () => {
        try {
            const cacheKey = await getCacheKey();
            const data = {
                referralCode,
                referralBalance,
                pendingBalance,
                totalReferrals,
                successfulReferrals,
                referredUsers,
                transactions,
                cachedAt: new Date().toISOString(),
            };
            await AsyncStorage.setItem(cacheKey, JSON.stringify(data));
        } catch (error) {
            console.error('Failed to cache referral data:', error);
        }
    };

    // Fetch referral data from backend
    const fetchReferralData = async () => {
        try {
            setIsLoading(true);
            setError(null);

            // Fetch user profile (includes referral_code and referral_balance)
            const userProfile = await AuthService.getUser();
            
            console.log('User Profile:', userProfile);
            console.log('Referral Code from API:', userProfile.referral_code);
            console.log('Referral Balance from API:', userProfile.referred_balance);
            
            setReferralCode(userProfile.referral_code || null);
            const balance = parseFloat(userProfile.referred_balance || '0');
            setReferralBalance(isNaN(balance) ? 0 : balance);
            setHasUsedReferralCode(userProfile.has_used_referral_code ?? false);

            // Fetch referred users list
            try {
                const referredUsersData = await AuthService.getReferredUsers();
                setReferredUsers(referredUsersData);
                
                // Calculate statistics from referred users
                const total = referredUsersData.length;
                const successful = referredUsersData.filter(u => u.has_completed_first_order).length;
                
                setTotalReferrals(total);
                setSuccessfulReferrals(successful);
                setPendingBalance(0); // Rewards are now instant on signup
            } catch (err: any) {
                console.error('Failed to fetch referred users:', err);
                // Continue even if this fails
            }

            // Fetch transaction history
            try {
                const transactionsData = await AuthService.getReferralTransactions();
                setTransactions(transactionsData);
            } catch (err: any) {
                console.error('Failed to fetch transactions:', err);
                // Continue even if this fails
            }

        } catch (err: any) {
            setError(err.message || 'Failed to fetch referral data');
            console.error('Referral data fetch error:', err);
        } finally {
            setIsLoading(false);
            // Cache data after successful fetch
            await cacheReferralData();
        }
    };

    // Refresh data (for pull-to-refresh)
    const refreshReferralData = async () => {
        setIsRefreshing(true);
        await fetchReferralData();
        setIsRefreshing(false);
    };

    // Clear error
    const clearError = () => setError(null);

    // Apply a friend's referral code
    const applyReferralCode = async (code: string): Promise<void> => {
        const updated = await AuthService.updateUserProfile({ promo_code: code.trim().toUpperCase() });
        const newBalance = parseFloat(updated.referred_balance || '0');
        setReferralBalance(isNaN(newBalance) ? 0 : newBalance);
        setHasUsedReferralCode(updated.has_used_referral_code ?? true);
        await cacheReferralData();
    };

    // Update balance and immediately cache it
    const updateBalanceAndCache = async (newBalance: number) => {
        setReferralBalance(newBalance);
        // Cache will be updated in next render cycle
        setTimeout(async () => {
            await cacheReferralData();
        }, 100);
    };

    // Clear cache (useful for logout)
    const clearCache = async () => {
        try {
            const cacheKey = await getCacheKey();
            await AsyncStorage.removeItem(cacheKey);
        } catch (error) {
            console.error('Failed to clear referral cache:', error);
        }
    };

    // Computed values
    const canRedeem = referralBalance > 0;
    
    const shareMessage = referralCode
        ? `🌱 Join me on Scrapiz - India's #1 Scrap Selling Platform!\n\n💰 Use my code: ${referralCode}\n🎁 You get ₹10 bonus instantly on sign-up\n🎁 I earn ₹20 when you join\n\n♻️ Turn your scrap into cash instantly!\n\n📱 Download Scrapiz:\n🤖 Android: https://play.google.com/store/apps/details?id=com.scrapiz.app\n🍎 iOS: https://apps.apple.com/in/app/scrapiz-sell-scrap-online/id6756441850`
        : '';

    // Legacy compatibility - for bonus system, return full balance
    const applyReferralDiscount = (amount: number) : number =>{
        // Return full referral balance (not capped at order amount)
        // This is a bonus added to payout, not a discount on order
        return referralBalance;
    }

    // Load cached data and fetch fresh data on mount
    useEffect(() => {
        const initializeData = async () => {
            // Clear old generic cache (migration)
            try {
                await AsyncStorage.removeItem('referral_cache');
            } catch {}
            
            await loadCachedData();
            await fetchReferralData();
        };
        initializeData();
    }, []);
    
    return(
        <ReferralContext.Provider value={{
            referralCode,
            referralBalance,
            pendingBalance,
            totalReferrals,
            successfulReferrals,
            referredUsers,
            transactions,
            hasUsedReferralCode,
            isLoading,
            isRefreshing,
            error,
            fetchReferralData,
            refreshReferralData,
            clearError,
            updateBalanceAndCache,
            applyReferralCode,
            canRedeem,
            shareMessage,
            // Legacy compatibility
            walletBalance: referralBalance,
            setWalletBalance: setReferralBalance,
            setTotalReferrals,
            setSuccessfulReferrals,
            applyReferralDiscount
        }}>{children}
        </ReferralContext.Provider>
    )
}

export function useReferral(){
    const context = useContext(ReferralContext);
    if (context === undefined) {
        throw new Error('useReferral must be used within a ReferralProvider');
  }
  return context;
}