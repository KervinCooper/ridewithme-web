import { useState } from 'react';
import { FlatList, Modal, Pressable, Text, View } from 'react-native';

interface Option<T> {
  label: string;
  value: T;
}

export function SelectField<T extends string | number>({
  label,
  placeholder,
  options,
  value,
  onChange,
}: {
  label: string;
  placeholder: string;
  options: Option<T>[];
  value: T | null;
  onChange: (value: T) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <View>
      <Text className="mb-1 text-text-muted">{label}</Text>
      <Pressable
        onPress={() => setOpen(true)}
        className="rounded-lg border border-border bg-surface px-4 py-3"
      >
        <Text className={selected ? 'text-text' : 'text-text-muted'}>
          {selected ? selected.label : placeholder}
        </Text>
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable className="flex-1 justify-end bg-black/60" onPress={() => setOpen(false)}>
          <View className="max-h-96 rounded-t-xl border border-border bg-surface p-2">
            <FlatList
              data={options}
              keyExtractor={(o) => String(o.value)}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => {
                    onChange(item.value);
                    setOpen(false);
                  }}
                  className="rounded-md px-4 py-3 active:bg-surface2"
                >
                  <Text className="text-text">{item.label}</Text>
                </Pressable>
              )}
              ListEmptyComponent={
                <Text className="p-4 text-center text-text-muted">No options.</Text>
              }
            />
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}
