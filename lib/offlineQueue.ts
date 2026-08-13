import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Network from 'expo-network';

import { supabase } from './supabase/client';

const QUEUE_KEY = 'onthemuv_offline_queue';

type QueuedMutation =
  | { type: 'studentStatus'; studentId: number; status: string }
  | { type: 'vehicleStatus'; vehicleId: number; status: string }
  | { type: 'bulkReset'; vehicleId: number };

async function readQueue(): Promise<QueuedMutation[]> {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  return raw ? JSON.parse(raw) : [];
}

async function writeQueue(queue: QueuedMutation[]) {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export async function enqueue(mutation: QueuedMutation) {
  const queue = await readQueue();
  queue.push(mutation);
  await writeQueue(queue);
}

async function apply(mutation: QueuedMutation) {
  if (mutation.type === 'studentStatus') {
    const { error } = await supabase
      .from('students')
      .update({ status: mutation.status })
      .eq('id', mutation.studentId);
    if (error) throw error;
  } else if (mutation.type === 'vehicleStatus') {
    const { error } = await supabase
      .from('vehicles')
      .update({ status: mutation.status })
      .eq('id', mutation.vehicleId);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from('students')
      .update({ status: 'WAITING FOR PICKUP' })
      .eq('vehicle_id', mutation.vehicleId);
    if (error) throw error;
  }
}

let flushing = false;

// Replays the queue in order, stopping (not skipping) on the first failure so
// a still-offline device doesn't reorder writes relative to what the driver
// actually did.
export async function flush(onFlushed?: () => void) {
  if (flushing) return;
  flushing = true;
  try {
    let queue = await readQueue();
    while (queue.length > 0) {
      const [next, ...rest] = queue;
      try {
        await apply(next);
      } catch {
        break;
      }
      queue = rest;
      await writeQueue(queue);
      onFlushed?.();
    }
  } finally {
    flushing = false;
  }
}

export function startOfflineQueueListener(onFlushed?: () => void) {
  flush(onFlushed);
  return Network.addNetworkStateListener((state) => {
    if (state.isConnected) {
      flush(onFlushed);
    }
  });
}
