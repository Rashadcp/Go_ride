# 🎨 Frontend – Go Ride

This frontend is built with **Next.js App Router** and follows modern UI/UX and performance best practices.

---

## 🧠 FRONTEND ARCHITECTURE

* SSR + CSR Hybrid Rendering
* Component-based design
* State separation (Zustand + TanStack Query)

---

## 📁 STRUCTURE

```text
app/
components/
hooks/
store/
lib/
```

---

## ♻️ REUSABLE COMPONENTS

* Button
* Input
* Modal
* RideCard
* DriverInfoCard
* WalletCard
* StarRating

---

## ⚡ SSR vs CSR

### SSR

* Search page
* Carpool list

### CSR

* Tracking page
* Map updates
* Wallet updates

---

## 🎨 DESIGN SYSTEM

### Colors

* Primary: #ece10fff
* Secondary: #040221ff

### Spacing

* 8px / 16px / 24px system

### Typography

* Clean & minimal

---

## 📱 UI/UX PRINCIPLES

* Mobile-first
* Bottom sheet layout
* Smooth animations
* Minimal UI (Uber-style)

---

## 📡 REAL-TIME UI

* Live driver tracking
* Smooth map updates
* Socket-based updates

---

## 💰 WALLET UI

* Balance display
* Add money (Razorpay)
* Transaction history

---

## 🚨 EMERGENCY UI

* Always visible button
* Confirmation modal

---

## ⭐ RATING UI

* Star-based system
* Feedback input

---

## ⚡ PERFORMANCE OPTIMIZATION

* Lazy loading
* Dynamic imports
* Memoization
* Debounced API calls

---

## 📦 EXAMPLE

```js
const Map = dynamic(() => import("./Map"), {
  ssr: false
});
```

---

## ⚠️ RULES

* Use reusable components
* Maintain consistent spacing
* Avoid unnecessary re-renders
* Optimize for mobile

---

## 🚀 FRONTEND SKILLS USED

* Next.js (SSR + CSR)
* Tailwind CSS
* State Management (Zustand)
* API Handling (TanStack Query)
* Performance Optimization
* UI/UX Design Principles

---

## 🎯 GOAL

Build a **fast, smooth, real-time UI** that feels like a production ride-sharing app.

---
