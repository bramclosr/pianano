'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface Goal {
  name: string;
  amount: number;
  description: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

const DonationProgress = () => {
  // Current donation amount in Nano
  const [currentAmount, setCurrentAmount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  
  // Fetch total donations
  useEffect(() => {
    const fetchDonations = async () => {
      try {
        setIsLoading(true);
        const response = await axios.get(`${API_URL}/total-donations`);
        setCurrentAmount(response.data.total);
      } catch (error) {
        console.error('Error fetching donations:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchDonations();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchDonations, 30000);
    return () => clearInterval(interval);
  }, []);
  
  // Goals in Nano (assuming 1 Nano = 1 Euro)
  const goals: Goal[] = [
    { name: "Add 6 More Notes", amount: 5, description: "Expand to a full octave with 6 additional solenoids" },
    { name: "Add LED Indicators", amount: 10, description: "Add LED lights to show which notes are playing" },
    { name: "Add Song Display", amount: 15, description: "Add a small display to show current song name" },
    { name: "Full Piano Upgrade", amount: 50, description: "Upgrade to a full 2-octave system with improved mechanics" }
  ];
  
  // Find the next goal
  const nextGoal = goals.find(goal => goal.amount > currentAmount) || goals[goals.length - 1];
  
  // Calculate progress percentage toward next goal
  const previousGoalAmount = goals.findIndex(goal => goal === nextGoal) > 0 
    ? goals[goals.findIndex(goal => goal === nextGoal) - 1].amount 
    : 0;
  
  const progressToNextGoal = ((currentAmount - previousGoalAmount) / (nextGoal.amount - previousGoalAmount)) * 100;
  
  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4 text-gray-900">Donation Progress</h2>
      
      <div className="mb-6">
        <div className="flex justify-between mb-2">
          <span className="font-medium text-gray-700">
            {isLoading ? 'Loading...' : `Total Donations: ${currentAmount.toFixed(1)} Nano`}
          </span>
          <span className="font-medium text-gray-700">Next Goal: {nextGoal.name} ({nextGoal.amount} Nano)</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-4">
          <div 
            className="bg-blue-500 h-4 rounded-full transition-all duration-500 ease-in-out" 
            style={{ width: `${Math.min(progressToNextGoal, 100)}%` }}
          ></div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {goals.map((goal, index) => (
          <div 
            key={index} 
            className={`p-4 rounded-lg border ${currentAmount >= goal.amount ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}
          >
            <h3 className="font-bold text-gray-900 mb-1">{goal.name}</h3>
            <p className="text-sm text-gray-600 mb-2">{goal.description}</p>
            <div className="flex items-center">
              <div className={`w-3 h-3 rounded-full mr-2 ${currentAmount >= goal.amount ? 'bg-green-500' : 'bg-gray-300'}`}></div>
              <span className={`text-sm ${currentAmount >= goal.amount ? 'text-green-600' : 'text-gray-500'}`}>
                {currentAmount >= goal.amount ? 'Achieved!' : `${goal.amount} Nano`}
              </span>
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-6 text-center">
        <p className="text-gray-600 mb-2">Help us improve the PiaNano with your donations!</p>
        <p className="text-sm text-gray-500">All donations go directly toward hardware upgrades and maintenance.</p>
      </div>
    </div>
  );
};

export default DonationProgress; 