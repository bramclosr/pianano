'use client';

import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import axios from 'axios';

interface Song {
  id: number;
  name: string;
  nano_address: string;
  price_raw: string;
}

interface PaymentModalProps {
  song: Song;
  onClose: () => void;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

// Format Nano amount to exactly 0.1 instead of 0.099999...
const formatNanoAmount = (rawAmount: string): string => {
  // Convert to number and divide by 10^30 (Nano raw conversion)
  const nanoAmount = Number(rawAmount) / 1e30;
  // Format to fixed 1 decimal place
  return nanoAmount.toFixed(1);
};

const PaymentModal = ({ song, onClose }: PaymentModalProps) => {
  const [paymentReceived, setPaymentReceived] = useState(false);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const nanoPaymentUrl = `nano:${song.nano_address}?amount=${song.price_raw}`;

  // Start monitoring when modal opens
  useEffect(() => {
    const startMonitoring = async () => {
      try {
        // Reset payment status and start monitoring
        await axios.post(`${API_URL}/start-monitoring/${song.nano_address}`);
        setIsMonitoring(true);
      } catch (error) {
        console.error('Error starting monitoring:', error);
      }
    };

    startMonitoring();

    // Clean up when modal closes
    return () => {
      // Stop monitoring when component unmounts
      axios.post(`${API_URL}/stop-monitoring/${song.nano_address}`)
        .catch(error => console.error('Error stopping monitoring:', error));
    };
  }, [song.nano_address]);

  // Poll for payment status
  useEffect(() => {
    if (!isMonitoring) return;

    const checkPayment = async () => {
      try {
        const response = await axios.get(`${API_URL}/payment-status/${song.nano_address}`);
        if (response.data.paid) {
          setPaymentReceived(true);
          setIsMonitoring(false); // Stop checking once payment is received
          setTimeout(onClose, 2000); // Changed from 3000 to 2000
        }
      } catch (error) {
        console.error('Error checking payment:', error);
      }
    };

    const interval = setInterval(checkPayment, 5000);
    return () => clearInterval(interval);
  }, [onClose, song.nano_address, isMonitoring]);

  return (
    <div className="fixed inset-0 bg-black/70 flex justify-center items-center z-50">
      <div className="bg-white p-8 rounded-lg max-w-md w-[90%] text-center">
        {paymentReceived ? (
          <div className="text-green-600">
            <h3 className="text-xl font-bold mb-4">Payment Received!</h3>
            <p>Your song will play shortly...</p>
          </div>
        ) : (
          <>
            <h3 className="text-xl font-bold mb-4 text-gray-900">Pay to Play: {song.name}</h3>
            <div className="my-6 flex justify-center">
              <QRCodeSVG
                value={nanoPaymentUrl}
                size={256}
                level="L"
                includeMargin={true}
                className="border-4 border-white rounded"
              />
            </div>
            <p className="text-sm text-gray-700 mb-2">
              Send {formatNanoAmount(song.price_raw)} Nano to:
            </p>
            <p className="bg-gray-100 p-2 rounded font-mono text-sm break-all text-gray-900">
              {song.nano_address}
            </p>
          </>
        )}
        <button
          className="mt-4 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
          onClick={onClose}
        >
          Close
        </button>
      </div>
    </div>
  );
};

export default PaymentModal; 