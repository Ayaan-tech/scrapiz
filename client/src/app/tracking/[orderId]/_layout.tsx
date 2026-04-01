import React from 'react';
import { Stack, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';
import { OrderTrackingProvider } from '../../../context/OrderTrackingContext';

export default function TrackingLayout() {
  const { orderId } = useLocalSearchParams<{ orderId?: string | string[] }>();
  const normalizedOrderId = Array.isArray(orderId) ? orderId[0] : orderId;
  const parsedOrderId = Number(normalizedOrderId);

  if (!Number.isFinite(parsedOrderId)) {
    return <View style={{ flex: 1 }} />;
  }

  return (
    <OrderTrackingProvider orderId={parsedOrderId}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="search" />
        <Stack.Screen name="live" />
        <Stack.Screen name="complete" />
      </Stack>
    </OrderTrackingProvider>
  );
}
