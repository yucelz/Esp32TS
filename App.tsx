import React, {useState} from 'react';
import {
  TouchableOpacity,
  Button,
  PermissionsAndroid,
  View,
  Text,
} from 'react-native';

import base64 from 'react-native-base64';

import {BleManager, Device} from 'react-native-ble-plx';
import {styles} from './Styles/styles';
import {LogBox} from 'react-native';
import {Buffer} from 'buffer';

LogBox.ignoreLogs(['new NativeEventEmitter']); // Ignore log notification by message
LogBox.ignoreAllLogs(); //Ignore all log notifications

/*
    NimBLEService* pMobileService = pServer->createService("1b0bf442-2a40-48ea-9b75-e5237f207420");
    NimBLECharacteristic* pMobileCharacteristic = pMobileService->createCharacteristic(
                                               "ccbdc5b7-8699-4335-9a1f-47f20480d3ed",
 */               

const BLTManager = new BleManager();
const SERVICE_UUID  ='1b0bf442-2a40-48ea-9b75-e5237f207420';
const MESSAGE_UUID  = 'ccbdc5b7-8699-4335-9a1f-47f20480d3ed';
const MESSAGE_SEND  = 'test yz mobile app';

function StringToBool(input: String) {
  if (input == '1') {
    return true;
  } else {
    return false;
  }
}

function BoolToString(input: boolean) {
  if (input == true) {
    return '1';
  } else {
    return '0';
  }
}

export default function App() {
  //Is a device connected?
  const [isConnected, setIsConnected] = useState(false);

  //What device is connected?
  const [connectedDevice, setConnectedDevice] = useState<Device>();

  const [message, setMessage] = useState('Nothing Yet');


  // Scans availbale BLT Devices and then call connectDevice
  async function scanDevices() {
    PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      {
        title: 'Permission Localisation Bluetooth',
        message: 'Requirement for Bluetooth',
        buttonNeutral: 'Later',
        buttonNegative: 'Cancel',
        buttonPositive: 'OK',
      },
    ).then(answere => {
      console.log('scanning');
      // display the Activityindicator

      BLTManager.startDeviceScan(null, null, (error, scannedDevice) => {
        if (error) {
          console.error(error);
        }

        if (scannedDevice && scannedDevice.name == 'NimBLE-Arduino') {
          BLTManager.stopDeviceScan();
          connectDevice(scannedDevice);
        }
      });

      // stop scanning devices after 5 seconds
      setTimeout(() => {
        BLTManager.stopDeviceScan();
      }, 5000);
    });
  }

  // handle the device disconnection (poorly)
  async function disconnectDevice() {
    console.log('Disconnecting start');

    if (connectedDevice != null) {
      const isDeviceConnected = await connectedDevice.isConnected();
      if (isDeviceConnected) {
        BLTManager.cancelTransaction('messagetransaction');
        BLTManager.cancelTransaction('nightmodetransaction');

        BLTManager.cancelDeviceConnection(connectedDevice.id).then(() =>
          console.log('DC completed'),
        );
      }

      const connectionStatus = await connectedDevice.isConnected();
      if (!connectionStatus) {
        setIsConnected(false);
      }
    }
  }

  //Connect the device and start monitoring characteristics
  async function connectDevice(device: Device) {
    console.log('connecting to Device:', device.name);

    device
      .connect()
      .then(device => {
        setConnectedDevice(device);
        setIsConnected(true);
        return device.discoverAllServicesAndCharacteristics();
      })
      .then(device => {
        //  Set what to do when DC is detected
        BLTManager.onDeviceDisconnected(device.id, (error, device) => {
          console.log('Device DC');
          setIsConnected(false);
        });

        //write inital values
        device.writeCharacteristicWithoutResponseForService(
          SERVICE_UUID,
          MESSAGE_UUID,
          Buffer.from(MESSAGE_SEND).toString('base64'),
          )
          .then((result) => {
            console.log(result);
          })
          .catch((error) => {
            console.log(error);
            throw error;
          });
   
     

        console.log('Connection established');
      });
  }

  return (
    <View>
      <View style={{paddingBottom: 200}}></View>

      {/* Title */}
      <View style={styles.rowView}>
        <Text style={styles.titleText}>BLE Example</Text>
      </View>

      <View style={{paddingBottom: 20}}></View>

      {/* Connect Button */}
      <View style={styles.rowView}>
        <TouchableOpacity style={{width: 120}}>
          {!isConnected ? (
            <Button
              title="Connect"
              onPress={() => {
                scanDevices();
              }}
              disabled={false}
            />
          ) : (
            <Button
              title="Disonnect"
              onPress={() => {
                disconnectDevice();
              }}
              disabled={false}
            />
          )}
        </TouchableOpacity>
      </View>

      <View style={{paddingBottom: 20}}></View>

      {/* Monitored Value */}

      <View style={styles.rowView}>
        <Text style={styles.baseText}>{message}</Text>
      </View>

      <View style={{paddingBottom: 20}}></View>


    </View>
  );
}
