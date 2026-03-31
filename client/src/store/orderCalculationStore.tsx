import {create} from 'zustand'

interface OrderItem {
  id: number;
  name: string;
  rate: number;
  unit: string;
  quantity: number;
}

interface OrderCalculationState {
  // Order items and calculations
  items: OrderItem[];
  estimatedValue: number;
  referralBonus: number;
  deliveryCharge: number;
  totalPayout: number;
  
  // Referral wallet
  useReferralBonus: boolean;
  availableReferralBalance: number;
  customReferralAmount: number;
  setTotalPayout: (totalPayout: number) => void;
  
  // Actions
  setItems: (items: OrderItem[]) => void;
  addItem: (item: OrderItem) => void;
  updateItemQuantity: (id: number, quantity: number) => void;
  removeItem: (id: number) => void;
  
  // Referral actions
  setAvailableReferralBalance: (balance: number) => void;
  toggleReferralBonus: () => void;
  setUseReferralBonus: (use: boolean) => void;
  setCustomReferralAmount: (amount: number) => void;
  
  // Calculation helpers
  calculateEstimatedValue: () => number;
  calculateReferralBonus: () => number;
  calculateDeliveryCharge: () => number;
  calculateTotalPayout: () => number;
  getTotalWeight: () => number;
  
  // Reset
  resetOrder: () => void;
}



export const useOrderCalculationStore = create<OrderCalculationState>((set, get) => ({
  // Initial state
  items: [],
  estimatedValue: 0,
  referralBonus: 0,
  deliveryCharge: 0,
  totalPayout: 0,
  useReferralBonus: false,
  availableReferralBalance: 0,
  customReferralAmount: 0,
  setTotalPayout: (totalPayout) => {
    set({ totalPayout });
  },
  
  // Get total weight of all items (in kg)
  getTotalWeight: () => {
    return get().items.reduce((sum, item) => sum + item.quantity, 0);
  },

  // Set all items and recalculate
  setItems: (items) => {
    const estimatedValue = items.reduce(
      (sum, item) => sum + (item.rate * item.quantity), 
      0
    );
    const state = get();
    const referralBonus = state.useReferralBonus ? state.customReferralAmount : 0;
    const totalWeight = items.reduce((sum, item) => sum + item.quantity, 0);
    // Delivery charge: ₹30 if weight < 20kg AND value < ₹200
    const deliveryCharge = (totalWeight < 20 && estimatedValue < 200) ? 30 : 0;
    const totalPayout = estimatedValue + referralBonus - deliveryCharge;
    
    set({ 
      items, 
      estimatedValue, 
      referralBonus, 
      deliveryCharge,
      totalPayout 
    });
  },
  
  // Add single item
  addItem: (item) => {
    const state = get();
    const existingItem = state.items.find(i => i.id === item.id);
    
    let newItems;
    if (existingItem) {
      newItems = state.items.map(i =>
        i.id === item.id
          ? { ...i, quantity: i.quantity + item.quantity }
          : i
      );
    } else {
      newItems = [...state.items, item];
    }
    
    get().setItems(newItems);
  },// Update item quantity
  updateItemQuantity: (id, quantity) => {
    const state = get();
    const newItems = quantity <= 0
      ? state.items.filter(i => i.id !== id)
      : state.items.map(i => i.id === id ? { ...i, quantity } : i);
    
    get().setItems(newItems);
  },
  
  // Remove item
  removeItem: (id) => {
    const state = get();
    const newItems = state.items.filter(i => i.id !== id);
    get().setItems(newItems);
  },// Set available referral balance from wallet
  setAvailableReferralBalance: (balance) => {
    set({ availableReferralBalance: balance });
    
    // Recalculate if referral is being used
    const state = get();
    if (state.useReferralBonus) {
      const referralBonus = balance;
      const totalPayout = state.estimatedValue + referralBonus - state.deliveryCharge;
      set({ referralBonus, totalPayout });
    }
  },
  
  // Toggle referral bonus usage
  toggleReferralBonus: () => {
    const state = get();
    const newUseReferral = !state.useReferralBonus;
    const referralBonus = newUseReferral ? state.availableReferralBalance : 0;
    const totalPayout = state.estimatedValue + referralBonus - state.deliveryCharge;
    
    set({ 
      useReferralBonus: newUseReferral, 
      referralBonus, 
      totalPayout 
    });
  },
  
  // Set referral bonus usage directly
  setUseReferralBonus: (use) => {
    const state = get();
    const referralBonus = use ? state.availableReferralBalance : 0;
    const totalPayout = state.estimatedValue + referralBonus - state.deliveryCharge;
    
    set({ 
      useReferralBonus: use, 
      referralBonus, 
      totalPayout 
    });
  },
  
  // Calculate estimated value (sum of all items)
  calculateEstimatedValue: () => {
    return get().estimatedValue;
  },
  
  // Calculate referral bonus (full wallet balance if enabled)
  calculateReferralBonus: () => {
    return get().referralBonus;
  },

  // Calculate delivery charge
  calculateDeliveryCharge: () => {
    return get().deliveryCharge;
  },
  
  // Calculate total payout (estimated value + referral bonus - delivery charge)
  calculateTotalPayout: () => {
    return get().totalPayout;
  },
  
  // Reset order state
  resetOrder: () => {
    set({
      items: [],
      estimatedValue: 0,
      referralBonus: 0,
      deliveryCharge: 0,
      totalPayout: 0,
      useReferralBonus: false,
      customReferralAmount: 0,
    });
  },
}));