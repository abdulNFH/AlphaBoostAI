import { useState } from 'react';
import { View, Text, Pressable, Modal, TextInput, Alert } from 'react-native';
import { router } from 'expo-router';

const PARENT_PIN = '1234'; // TODO: store securely later (e.g., Firestore/user profile)

export default function HeaderMenu() {
  const [open, setOpen] = useState(false);
  const [pinOpen, setPinOpen] = useState(false);
  const [pin, setPin] = useState('');

  const go = (path: string) => {
    setOpen(false);
    router.push(path as any);
  };

  const tryReports = () => {
    setOpen(false);
    setPin('');
    setPinOpen(true);
  };

  const checkPin = () => {
    if (pin === PARENT_PIN) {
      setPinOpen(false);
      router.push('/reports' as any);
    } else {
      Alert.alert('Incorrect PIN', 'Please try again');
      setPin('');
    }
  };

  return (
    <>
      {/* Header button (tap to open) — larger touch target & icon */}
      <Pressable
        onPress={() => setOpen(true)}
        style={{ paddingHorizontal: 16, paddingVertical: 12 }}
        accessibilityLabel="Parents menu"
        accessibilityRole="button"
      >
        <Text style={{ fontSize: 26 }}>≡</Text>
      </Pressable>

      {/* Dropdown sheet — wider, larger text & comfy spacing */}
      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.15)' }}
          onPress={() => setOpen(false)}
        >
          <View
            style={{
              position: 'absolute',
              left: 12,
              top: 64,
              width: 280,
              borderRadius: 20,
              backgroundColor: '#fff',
              padding: 16,
              borderWidth: 1,
              borderColor: '#e2e8f0',
              shadowColor: '#000',
              shadowOpacity: 0.2,
              shadowRadius: 12,
              elevation: 6,
            }}
          >
            <Text style={{ fontWeight: '800', fontSize: 20, marginBottom: 12 }}>
              Menu
            </Text>

            <Pressable onPress={() => go('/account')} style={{ paddingVertical: 16 }}>
              <Text style={{ fontSize: 18 }}>👤 Account</Text>
            </Pressable>

            <View style={{ height: 1, backgroundColor: '#e2e8f0' }} />

            <Pressable onPress={() => go('/settings')} style={{ paddingVertical: 16 }}>
              <Text style={{ fontSize: 18 }}>⚙️ Settings</Text>
            </Pressable>

            <View style={{ height: 1, backgroundColor: '#e2e8f0' }} />

            <Pressable onPress={tryReports} style={{ paddingVertical: 16 }}>
              <Text style={{ fontSize: 18 }}>📊 Reports (Parents)</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      {/* PIN modal for Reports — larger inputs/buttons */}
      <Modal
        visible={pinOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setPinOpen(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.25)' }}
          onPress={() => setPinOpen(false)}
        >
          <View
            style={{
              position: 'absolute',
              left: 24,
              right: 24,
              top: '35%',
              borderRadius: 20,
              backgroundColor: '#fff',
              padding: 18,
              borderWidth: 1,
              borderColor: '#e2e8f0',
              shadowColor: '#000',
              shadowOpacity: 0.2,
              shadowRadius: 12,
              elevation: 6,
            }}
          >
            <Text style={{ fontWeight: '800', fontSize: 20, marginBottom: 12 }}>
              Parent PIN
            </Text>

            <TextInput
              value={pin}
              onChangeText={setPin}
              keyboardType="number-pad"
              maxLength={6}
              placeholder="Enter PIN"
              secureTextEntry
              style={{
                borderWidth: 1,
                borderColor: '#cbd5e1',
                borderRadius: 12,
                padding: 12,
                fontSize: 20,
              }}
            />

            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'flex-end',
                gap: 16,
                marginTop: 14,
              }}
            >
              <Pressable onPress={() => setPinOpen(false)}>
                <Text style={{ padding: 10, fontSize: 16 }}>Cancel</Text>
              </Pressable>
              <Pressable onPress={checkPin}>
                <Text style={{ padding: 10, fontSize: 16, fontWeight: '700', color: '#2563eb' }}>
                  Unlock
                </Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}
