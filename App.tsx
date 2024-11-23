import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Button,
  Alert,
  StyleSheet,
  ToastAndroid,
  TextInput,
} from 'react-native';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';

const config = {
  prefix: 'Locator',
};

const saveToStorage = async (name: string, values: string) => {
  try {
    return await AsyncStorage.setItem(
      `${config.prefix}-${name}`,
      JSON.stringify(values)
    );
  } catch (error) {
    return error;
  }
};

const loadFromStorage = async (name: string) => {
  try {
    const value = await AsyncStorage.getItem(`${config.prefix}-${name}`);
    if (value) return JSON.parse(value);
    return null;
  } catch (error) {
    return error;
  }
};

const BASE_URL = 'http://vierone.anyengarden.com.vn:9009/api/vierone/v1';

const apiHandler = async ({
  method = 'POST',
  endpoint = '',
  params = undefined,
}) => {
  const token = await loadFromStorage('token');

  const headers = {
    'Content-Type': 'application/json',
    Authorization: !!token ? `Bearer ${token}` : '',
  };

  return fetch(`${BASE_URL}/${endpoint}`, {
    method: method,
    headers,
    ...(!!params ? { body: JSON.stringify(params) } : {}),
  }).then((response) => response.json());
};

const updateDevice = async ({ lat, long }: any) => {
  const deviceId = await loadFromStorage('id');

  console.log('device id', deviceId);
  const res = await apiHandler({
    endpoint: 'device/update',
    //@ts-ignore
    params: {
      deviceId,
      state: {
        location: {
          lat: lat,
          lon: long,
        },
        moveStatus: 'MOVE',
      },
    },
  });
  if (res?.error) {
    ToastAndroid.show(`Có lỗi xảy ra: ${res?.errorName}`, 1000);
  } else {
    ToastAndroid.show(`Success!`, 1000);
  }
};

// Define the task for background location updates
TaskManager.defineTask(
  'BACKGROUND_LOCATION_TASK',
  async ({ data, error }: any) => {
    if (error) {
      console.error(error);
      return;
    }
    const { locations } = data;

    setInterval(() => {
      updateDevice({
        lat: locations[0]?.coords?.latitude,
        long: locations[0]?.coords?.longitude,
      });
    }, 15000);

    //@ts-ignore
    await updateDevice({
      lat: locations[0]?.coords?.latitude,
      long: locations[0]?.coords?.longitude,
    });
    console.log('Received new locations', locations);
    // You can also send the location data to your server here
  }
);

export default function App() {
  const [id, setId] = useState('ef04fbe09c5111efa0f7ea1cd2fd3f84');
  const [token, setToken] = useState('178de7b0a7c011efa948ea1cd2fd3f84');

  const requestPermissions = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();

    ToastAndroid.show(status, 1000);

    if (status !== 'granted') {
      Alert.alert('Permission to access location was denied');
      return;
    }
  };

  const requestBgPermissions = async () => {
    const { status } = await Location.requestBackgroundPermissionsAsync();

    ToastAndroid.show(status, 1000);

    if (status !== 'granted') {
      Alert.alert('Permission to access bg location was denied');
      return;
    }
  };

  const getLocation = async () => {
    let location = await Location.getCurrentPositionAsync();

    ToastAndroid.show(
      `current: lat: ${location?.coords.latitude}, long: ${location?.coords.longitude}`,
      1000
    );

    updateDevice({
      lat: location?.coords.latitude,
      long: location?.coords.longitude,
    });
  };

  const checkId = async () => {
    const deviceId = await loadFromStorage('id');
    console.log('check id', deviceId);
    if (!!deviceId) {
      setId(deviceId);
    } else {
      await saveToStorage('id', id);
    }
  };

  const checkToken = async () => {
    const tokenStorage = await loadFromStorage('token');
    if (!!tokenStorage) {
      setToken(token);
    } else {
      await saveToStorage('token', token);
    }
  };

  useEffect(() => {
    requestPermissions();
    requestBgPermissions();
    checkToken();
    checkId();
  }, []);

  const startTracking = async () => {
    await Location.startLocationUpdatesAsync('BACKGROUND_LOCATION_TASK', {
      accuracy: Location.Accuracy.High,
      timeInterval: 10000, // Update every 10 seconds
      distanceInterval: 10, // Update every 10 meters
      showsBackgroundLocationIndicator: true, // For iOS,
      foregroundService: {
        notificationTitle: 'Location Tracking',
        notificationBody: 'Your location is being tracked in the background.',
        notificationColor: '#FFFFFF',
      },
    });

    Alert.alert('Background location tracking started!');
  };

  const stopTracking = async () => {
    await Location.stopLocationUpdatesAsync('BACKGROUND_LOCATION_TASK');
    Alert.alert('Background location tracking stop!');
  };

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <View style={styles.boxContainer}>
        <Button title='Request' onPress={requestPermissions} />
      </View>
      <View style={styles.boxContainer}>
        <Button title='Request Bg' onPress={requestBgPermissions} />
      </View>
      <View style={styles.boxContainer}>
        <Button title='Start Tracking' onPress={startTracking} />
      </View>
      <View style={styles.boxContainer}>
        <Button title='Stop Tracking' onPress={stopTracking} />
      </View>
      <View style={styles.boxContainer}>
        <Button title='Update current location' onPress={getLocation} />
      </View>
      <Text>Token</Text>
      <View style={styles.row}>
        <TextInput
          placeholder='token'
          placeholderTextColor={'#000'}
          style={styles.input}
          defaultValue={token}
          onChange={(e) => setToken(e.nativeEvent.text)}
        ></TextInput>
        <Button title='Save' onPress={() => saveToStorage('token', token)} />
      </View>
      <Text>Devide Id</Text>
      <View style={styles.row}>
        <TextInput
          defaultValue={id}
          placeholder='device id'
          placeholderTextColor={'#000'}
          style={styles.input}
          onChange={(e) => setId(e.nativeEvent.text)}
        ></TextInput>
        <Button
          title='Save'
          onPress={() =>
            saveToStorage('id', id).then(() =>
              ToastAndroid.show('change success!', 500)
            )
          }
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  boxContainer: {
    marginVertical: 12,
    width: 160,
  },
  row: {
    alignSelf: 'center',
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    backgroundColor: '#1f222a33',
    borderRadius: 4,
    width: '80%',
    height: 36,
  },
});
