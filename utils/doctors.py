"""
utils/doctors.py

Doctor recommendation dataset + filtering logic.
"""

from dataclasses import dataclass, field
from typing import List, Optional

@dataclass
class Doctor:
    name: str
    specialization: str
    hospital: str
    city: str
    experience_years: int
    rating: float
    consultation_fee: int   # INR
    available_days: str
    phone: str
    address: str
    for_risk: List[str]     # ["Low", "Medium", "High"]

# ── Static doctor database ─────────────────────────────────────────────────────
DOCTORS_DB: List[Doctor] = [
    # Mumbai
    Doctor("Dr. Priya Sharma", "Interventional Cardiologist", "Kokilaben Dhirubhai Ambani Hospital",
           "Mumbai", 18, 4.9, 1500, "Mon-Sat", "+91-22-30999999",
           "Rao Saheb Achutrao Patwardhan Marg, Andheri West, Mumbai",
           ["Medium", "High"]),
    Doctor("Dr. Arjun Mehta", "Cardiologist & Electrophysiologist", "Lilavati Hospital",
           "Mumbai", 22, 4.8, 2000, "Mon-Fri", "+91-22-26568000",
           "C-1, Hill Road, Bandra West, Mumbai",
           ["High"]),
    Doctor("Dr. Sneha Kulkarni", "General Cardiologist", "Hinduja Hospital",
           "Mumbai", 12, 4.6, 1200, "Tue-Sun", "+91-22-24452222",
           "Veer Savarkar Marg, Mahim, Mumbai",
           ["Low", "Medium"]),
    # Delhi
    Doctor("Dr. Rahul Gupta", "Senior Cardiologist", "AIIMS New Delhi",
           "Delhi", 25, 4.9, 800, "Mon-Fri", "+91-11-26588500",
           "Sri Aurobindo Marg, Ansari Nagar, New Delhi",
           ["Medium", "High"]),
    Doctor("Dr. Kavita Joshi", "Preventive Cardiologist", "Fortis Escorts Heart Institute",
           "Delhi", 15, 4.7, 1800, "Mon-Sat", "+91-11-47135000",
           "Okhla Road, New Delhi",
           ["Low", "Medium", "High"]),
    Doctor("Dr. Vikram Singh", "Interventional Cardiologist", "Max Super Speciality Hospital",
           "Delhi", 20, 4.8, 2200, "Mon-Sat", "+91-11-26515050",
           "Press Enclave Road, Saket, New Delhi",
           ["High"]),
    # Bangalore
    Doctor("Dr. Anand Krishnan", "Cardiologist", "Narayana Health City",
           "Bangalore", 19, 4.9, 1200, "Mon-Sat", "+91-80-71222222",
           "258/A, Bommasandra Industrial Area, Anekal Taluk, Bangalore",
           ["Medium", "High"]),
    Doctor("Dr. Lakshmi Patel", "Cardiac Surgeon", "Manipal Hospital",
           "Bangalore", 24, 4.8, 2500, "Mon-Fri", "+91-80-25024444",
           "98, HAL Airport Road, Bangalore",
           ["High"]),
    Doctor("Dr. Suresh Reddy", "Non-Invasive Cardiologist", "Apollo Hospital",
           "Bangalore", 14, 4.6, 1100, "Mon-Sun", "+91-80-26304050",
           "154/11, Opp. IIM-B, Bannerghatta Main Road, Bangalore",
           ["Low", "Medium"]),
    # Hyderabad
    Doctor("Dr. Ravi Teja", "Cardiologist", "Yashoda Hospitals",
           "Hyderabad", 16, 4.7, 1000, "Mon-Sat", "+91-40-45673000",
           "Behind Hari Hara Kala Bhavan, S.D. Road, Secunderabad",
           ["Medium", "High"]),
    Doctor("Dr. Padma Iyer", "Preventive Cardiologist", "KIMS Hospital",
           "Hyderabad", 11, 4.5, 900, "Tue-Sun", "+91-40-44885000",
           "1-8-31/1, Minister Road, Krishna Nagar Colony, Hyderabad",
           ["Low", "Medium"]),
    # Chennai
    Doctor("Dr. Mohan Kumar", "Interventional Cardiologist", "Apollo Hospital Chennai",
           "Chennai", 21, 4.9, 1800, "Mon-Sat", "+91-44-28296000",
           "21, Greams Lane, Off Greams Road, Chennai",
           ["High"]),
    Doctor("Dr. Meena Devi", "General Cardiologist", "Fortis Malar Hospital",
           "Chennai", 13, 4.6, 1100, "Mon-Fri", "+91-44-42892222",
           "52, First Main Road, Gandhi Nagar, Adyar, Chennai",
           ["Low", "Medium"]),
    # Pune
    Doctor("Dr. Nitin Deshpande", "Cardiologist", "Ruby Hall Clinic",
           "Pune", 17, 4.7, 1300, "Mon-Sat", "+91-20-66455000",
           "40, Sassoon Road, Sangamvadi, Pune",
           ["Medium", "High"]),
    Doctor("Dr. Anjali Shah", "Preventive Cardiologist", "Sahyadri Hospitals",
           "Pune", 10, 4.5, 950, "Mon-Sun", "+91-20-67217777",
           "30-C, Karve Road, Erandwane, Pune",
           ["Low", "Medium"]),
    # Kolkata
    Doctor("Dr. Subhas Bose", "Cardiologist", "Apollo Gleneagles Hospital",
           "Kolkata", 20, 4.8, 1600, "Mon-Sat", "+91-33-23203040",
           "58, Canal Circular Road, Kadapara, Kolkata",
           ["Medium", "High"]),
    Doctor("Dr. Rina Chakraborty", "General Cardiologist", "Fortis Hospital Kolkata",
           "Kolkata", 12, 4.5, 1000, "Tue-Sun", "+91-33-66284444",
           "730 Anandapur, E M Bypass, Kolkata",
           ["Low", "Medium"]),
    # Ahmedabad
    Doctor("Dr. Harishchandra Patel", "Interventional Cardiologist", "UN Mehta Heart Institute",
           "Ahmedabad", 23, 4.9, 700, "Mon-Fri", "+91-79-22682222",
           "Civil Hospital Campus, Asarwa, Ahmedabad",
           ["High"]),
    Doctor("Dr. Priti Modi", "Cardiologist", "Sterling Hospital",
           "Ahmedabad", 14, 4.6, 1200, "Mon-Sat", "+91-79-40011000",
           "Near Gurukul Road, Memnagar, Ahmedabad",
           ["Low", "Medium"]),
]


def recommend_doctors(
    city: str,
    risk_level: str,
    limit: int = 3
) -> List[dict]:
    """
    Filter doctors by city (case-insensitive fuzzy) and risk level.
    Returns list of dicts.
    """
    city_lower = city.strip().lower()

    filtered = [
        d for d in DOCTORS_DB
        if city_lower in d.city.lower() and risk_level in d.for_risk
    ]

    if not filtered:
        # Return all doctors for that risk level if city not matched
        filtered = [d for d in DOCTORS_DB if risk_level in d.for_risk]

    # Sort by rating desc
    filtered.sort(key=lambda d: (d.rating, d.experience_years), reverse=True)

    return [
        {
            "name":             d.name,
            "specialization":   d.specialization,
            "hospital":         d.hospital,
            "city":             d.city,
            "experience_years": d.experience_years,
            "rating":           d.rating,
            "consultation_fee": d.consultation_fee,
            "available_days":   d.available_days,
            "phone":            d.phone,
            "address":          d.address,
        }
        for d in filtered[:limit]
    ]
