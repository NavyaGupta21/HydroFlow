# 🌊 HydroFlow – Smart Water & Health Habit Tracker

HydroFlow is a smart hydration tracking web application built using **HTML, CSS, and Vanilla JavaScript**. It helps users maintain healthy hydration habits by calculating personalized daily water goals, tracking water intake, monitoring streaks, analyzing hydration history, and providing weather-based recommendations.

The application stores all user data locally using **LocalStorage**, making it lightweight, fast, and easy to use without any backend.

---

## 📌 Features

### 💧 Water Intake Tracker
- Log water and different drink types
- Track today's hydration progress
- Progress bar with percentage completion
- View today's entries
- Clear daily entries

### 🥤 Drink Type Support
Supports multiple beverages including:
- Water
- Coconut Water
- Electrolyte Drink
- Juice
- Milk
- Tea
- Green Tea
- Coffee
- Soft Drink
- Energy Drink
- Smoothie
- Sports Drink
- Alcohol
- Other

---

## 🎯 Personalized Water Goal

Daily hydration goal is calculated using:

- Age
- Weight
- Height
- Activity Level
- BMI
- Weather Conditions

The goal automatically updates based on user profile and environmental conditions.

---

## ⚖️ BMI Calculator

Calculates:

- BMI Value
- BMI Category
- Personalized hydration recommendation

BMI categories:
- Underweight
- Normal
- Overweight
- Obese

---

## 🌦 Weather Integration

Uses the OpenWeather API to display:

- Current Temperature
- Humidity
- Weather Condition
- City Name

Based on weather, HydroFlow automatically adjusts the recommended water intake.

---

## 🤖 Hydration Coach

Provides smart hydration tips based on:

- Current weather
- BMI
- Daily water intake
- Activity level
- Hydration goal progress

---

## ⏳ Reminder Hub

### Timer
- Start
- Pause
- Reset

### Stopwatch
- Start
- Pause
- Reset

### Smart Alarm
- Set drink water alarms
- Multiple alarms
- Alarm notification

### Auto Reminders
- Custom reminder interval
- Sleep mode support
- Enable/Disable reminders
- Missed reminder tracking

---

## 🏆 Habit Streaks

- Daily hydration streak
- Monthly calendar
- Streak visualization
- Achievement badges

---

## 📈 Progress Dashboard

Analytics include:

- Daily Progress
- Weekly Progress
- Monthly Progress

Built using **Chart.js**.

---

## 📤 Export Reports

Export hydration history as:

- CSV
- PDF

---

## 💾 Local Storage

HydroFlow stores:

- User profile
- Water intake history
- Goals
- BMI
- Analytics
- Streaks
- Reminder settings
- Achievements

No database is required.

---

## 🛠 Technologies Used

- HTML5
- CSS3
- JavaScript (ES6)
- LocalStorage
- Chart.js
- jsPDF
- OpenWeather API

---

## 📂 Project Structure

```
HydroFlow/
│
├── index.html
├── style.css
├── script.js
├── README.md
├── manifest.json (Optional)
└── sw.js (Optional)
```

---

## 🔑 API Configuration

```javascript
const API_KEY = "Your API Key";
```

Get your free API key from: https://openweathermap.org/api

---

## 🚀 Future Improvements

- Firebase Login
- Cloud Backup
- AI-powered hydration recommendations
- Smart wearable integration
- Voice reminders
- Health dashboard
