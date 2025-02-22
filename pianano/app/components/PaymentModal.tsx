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

const TEST_NANO_ADDRESS = 'nano_3uct7fjjxg87ccg3n6dtx51hk7ekjkz79ihd7pdsasp6qzo9pim6fcy1jh66';

const PaymentModal = ({ song, onClose }: PaymentModalProps) => {
  const [paymentReceived, setPaymentReceived] = useState(false);
  const nanoPaymentUrl = `nano:${TEST_NANO_ADDRESS}?amount=${song.price_raw}`;

  // Poll for payment status
  useEffect(() => {
    const checkPayment = async () => {
      try {
        const response = await axios.get(`http://localhost:3000/payment-status/${TEST_NANO_ADDRESS}`);
        if (response.data.paid) {
          setPaymentReceived(true);
          setTimeout(onClose, 3000); // Close modal after 3 seconds
        }
      } catch (error) {
        console.error('Error checking payment:', error);
      }
    };

    const interval = setInterval(checkPayment, 5000); // Check every 5 seconds
    return () => clearInterval(interval);
  }, [onClose]);

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
              Send {Number(song.price_raw) / 1e30} Nano to:
            </p>
            <p className="bg-gray-100 p-2 rounded font-mono text-sm break-all text-gray-900">
              {TEST_NANO_ADDRESS}
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