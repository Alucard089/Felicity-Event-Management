import { useState, useRef, useEffect } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";

import { API_AUTH } from "../config";

const API = API_AUTH;

function isIIITEmail(email) {
  return email.endsWith("@students.iiit.ac.in") || email.endsWith("@research.iiit.ac.in");
}

// Indian colleges/universities list
const INDIAN_COLLEGES = [
  // IITs
  "IIT Bombay", "IIT Delhi", "IIT Madras", "IIT Kanpur", "IIT Kharagpur",
  "IIT Roorkee", "IIT Guwahati", "IIT Hyderabad", "IIT Indore", "IIT Jodhpur",
  "IIT Mandi", "IIT Patna", "IIT Ropar", "IIT Bhubaneswar", "IIT Gandhinagar",
  "IIT Tirupati", "IIT Dhanbad (ISM)", "IIT Bhilai", "IIT Goa", "IIT Jammu",
  "IIT Dharwad", "IIT Palakkad", "IIT Varanasi (BHU)",
  // NITs
  "NIT Trichy", "NIT Warangal", "NIT Surathkal", "NIT Calicut", "NIT Rourkela",
  "NIT Allahabad (MNNIT)", "NIT Surat (SVNIT)", "NIT Nagpur (VNIT)", "NIT Durgapur",
  "NIT Jamshedpur", "NIT Kurukshetra", "NIT Silchar", "NIT Hamirpur", "NIT Jalandhar",
  "NIT Patna", "NIT Bhopal (MANIT)", "NIT Agartala", "NIT Arunachal Pradesh",
  "NIT Delhi", "NIT Goa", "NIT Manipur", "NIT Meghalaya", "NIT Mizoram",
  "NIT Nagaland", "NIT Puducherry", "NIT Raipur", "NIT Sikkim", "NIT Srinagar",
  "NIT Uttarakhand", "NIT Andhra Pradesh",
  // IIITs
  "IIIT Hyderabad", "IIIT Allahabad", "IIIT Bangalore", "IIIT Delhi",
  "IIIT Gwalior", "IIIT Jabalpur", "IIIT Kancheepuram", "IIIT Kota",
  "IIIT Lucknow", "IIIT Manipur", "IIIT Pune", "IIIT Ranchi", "IIIT Senapati",
  "IIIT Sri City", "IIIT Surat", "IIIT Tiruchirappalli", "IIIT Una", "IIIT Vadodara",
  "IIIT Nagpur", "IIIT Dharwad", "IIIT Bhagalpur",
  // IISc & IISERs
  "IISc Bangalore", "IISER Pune", "IISER Kolkata", "IISER Mohali",
  "IISER Bhopal", "IISER Thiruvananthapuram", "IISER Tirupati", "IISER Berhampur",
  // Central Universities
  "Delhi University", "Jawaharlal Nehru University (JNU)", "Banaras Hindu University (BHU)",
  "Hyderabad University (UoH)", "Jadavpur University", "Manipal Academy of Higher Education",
  "Aligarh Muslim University", "Jamia Millia Islamia", "Pondicherry University",
  "Tezpur University", "Visva-Bharati University", "Hemwati Nandan Bahuguna University",
  "Mahatma Gandhi University", "Assam University", "Mizoram University",
  "Nagaland University", "Sikkim University", "Tripura University",
  // BITS
  "BITS Pilani – Pilani Campus", "BITS Pilani – Goa Campus", "BITS Pilani – Hyderabad Campus",
  "BITS Pilani – Dubai Campus",
  // Top Private & Deemed Universities
  "Amity University", "SRM Institute of Science and Technology", "VIT Vellore",
  "VIT Chennai", "Symbiosis International University", "Christ University",
  "Lovely Professional University", "Chandigarh University", "Thapar University",
  "Kalinga Institute of Industrial Technology (KIIT)", "Vellore Institute of Technology",
  "PSG College of Technology", "Coimbatore Institute of Technology",
  "Anna University", "Osmania University", "Andhra University",
  "Pune University (SPPU)", "Mumbai University", "Calcutta University",
  "Madras University", "Bangalore University", "Gujarat University",
  "Rajasthan University", "Lucknow University", "Allahabad University",
  "Patna University", "Dibrugarh University", "Gauhati University",
  "Panjab University", "Kurukshetra University", "MDU Rohtak",
  "JNTU Hyderabad", "JNTU Kakinada", "Kakatiya University",
  "Sri Venkateswara University", "Acharya Nagarjuna University",
  "Sri Ramachandra University", "Amrita Vishwa Vidyapeetham",
  "Vellore Medical College", "CMC Vellore",
  // IIMs
  "IIM Ahmedabad", "IIM Bangalore", "IIM Calcutta", "IIM Lucknow",
  "IIM Kozhikode", "IIM Indore", "IIM Shillong", "IIM Rohtak", "IIM Raipur",
  "IIM Ranchi", "IIM Kashipur", "IIM Udaipur", "IIM Visakhapatnam",
  "IIM Bodh Gaya", "IIM Jammu", "IIM Sirmaur", "IIM Nagpur", "IIM Sambalpur",
  // Others
  "TISS Mumbai", "NIFT Delhi", "NID Ahmedabad", "National Law School Bangalore",
  "NALSAR Hyderabad", "Faculty of Law, Delhi University",
  "AIIMS Delhi", "AIIMS Bhopal", "AIIMS Jodhpur", "AIIMS Patna", "AIIMS Rishikesh",
  "Maulana Azad Medical College", "Grant Medical College",
  "Lady Hardinge Medical College", "Armed Forces Medical College",
  "Manipal College of Medical Sciences", "Kasturba Medical College",
];

// Country codes with expected phone number lengths (digits after country code)
const countryCodes = [
  { code: "+91", country: "India", len: 10 },
  { code: "+1", country: "US / Canada", len: 10 },
  { code: "+44", country: "UK", len: 10 },
  { code: "+61", country: "Australia", len: 9 },
  { code: "+81", country: "Japan", len: 10 },
  { code: "+49", country: "Germany", len: 11 },
  { code: "+33", country: "France", len: 9 },
  { code: "+86", country: "China", len: 11 },
  { code: "+82", country: "South Korea", len: 10 },
  { code: "+39", country: "Italy", len: 10 },
  { code: "+34", country: "Spain", len: 9 },
  { code: "+7", country: "Russia", len: 10 },
  { code: "+55", country: "Brazil", len: 11 },
  { code: "+52", country: "Mexico", len: 10 },
  { code: "+27", country: "South Africa", len: 9 },
  { code: "+971", country: "UAE", len: 9 },
  { code: "+966", country: "Saudi Arabia", len: 9 },
  { code: "+65", country: "Singapore", len: 8 },
  { code: "+60", country: "Malaysia", len: 10 },
  { code: "+62", country: "Indonesia", len: 11 },
  { code: "+63", country: "Philippines", len: 10 },
  { code: "+66", country: "Thailand", len: 9 },
  { code: "+84", country: "Vietnam", len: 9 },
  { code: "+90", country: "Turkey", len: 10 },
  { code: "+48", country: "Poland", len: 9 },
  { code: "+31", country: "Netherlands", len: 9 },
  { code: "+46", country: "Sweden", len: 9 },
  { code: "+47", country: "Norway", len: 8 },
  { code: "+45", country: "Denmark", len: 8 },
  { code: "+358", country: "Finland", len: 9 },
  { code: "+41", country: "Switzerland", len: 9 },
  { code: "+43", country: "Austria", len: 10 },
  { code: "+32", country: "Belgium", len: 9 },
  { code: "+351", country: "Portugal", len: 9 },
  { code: "+353", country: "Ireland", len: 9 },
  { code: "+30", country: "Greece", len: 10 },
  { code: "+20", country: "Egypt", len: 10 },
  { code: "+234", country: "Nigeria", len: 10 },
  { code: "+254", country: "Kenya", len: 9 },
  { code: "+92", country: "Pakistan", len: 10 },
  { code: "+94", country: "Sri Lanka", len: 9 },
  { code: "+880", country: "Bangladesh", len: 10 },
  { code: "+977", country: "Nepal", len: 10 },
  { code: "+64", country: "New Zealand", len: 9 },
  { code: "+972", country: "Israel", len: 9 },
  { code: "+56", country: "Chile", len: 9 },
  { code: "+57", country: "Colombia", len: 10 },
  { code: "+54", country: "Argentina", len: 10 },
  { code: "+51", country: "Peru", len: 9 },
];

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    firstName: "", lastName: "", email: "", password: "",
    college: "", phoneNumber: "", countryCode: "+91",
  });
  const [error, setError] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [collegeSuggestions, setCollegeSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const collegeRef = useRef(null);

  const selectedCountry = countryCodes.find((c) => c.code === form.countryCode);
  const expectedLen = selectedCountry ? selectedCountry.len : null;

  // Close suggestions on outside click
  useEffect(() => {
    const handler = (e) => {
      if (collegeRef.current && !collegeRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    const updated = { ...form, [name]: value };

    // Auto-fill college when IIIT email is typed
    if (name === "email") {
      if (isIIITEmail(value)) {
        updated.college = "IIIT Hyderabad";
      } else if (form.college === "IIIT Hyderabad" && !isIIITEmail(value)) {
        // Clear auto-filled college if user changes away from IIIT email
        updated.college = "";
      }
    }

    // Filter college suggestions when typing in college field
    if (name === "college") {
      if (value.length > 0) {
        const filtered = INDIAN_COLLEGES.filter((c) =>
          c.toLowerCase().includes(value.toLowerCase())
        ).slice(0, 8);
        setCollegeSuggestions(filtered);
        setShowSuggestions(filtered.length > 0);
      } else {
        setShowSuggestions(false);
      }
    }

    setForm(updated);

    // Validate phone length on change
    if (name === "phoneNumber" || name === "countryCode") {
      const phone = name === "phoneNumber" ? value : form.phoneNumber;
      const cc = name === "countryCode" ? value : form.countryCode;
      const country = countryCodes.find((c) => c.code === cc);
      if (phone && country && phone.length !== country.len) {
        setPhoneError(`Phone number should be ${country.len} digits for ${country.country}`);
      } else {
        setPhoneError("");
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // Validate phone before submit
    if (form.phoneNumber && expectedLen && form.phoneNumber.length !== expectedLen) {
      setError(`Phone number must be ${expectedLen} digits for ${selectedCountry.country}`);
      return;
    }

    try {
      const payload = {
        ...form,
        contactNumber: form.phoneNumber ? `${form.countryCode} ${form.phoneNumber}` : "",
      };
      const res = await axios.post(`${API}/register`, payload);
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));
      navigate("/onboarding");
    } catch (err) {
      setError(err.response?.data?.msg || "Registration failed");
    }
  };

  const iiit = isIIITEmail(form.email);

  return (
    <div style={{ maxWidth: 400, margin: "80px auto", padding: 20 }}>
      <h2>Register</h2>
      {error && <p style={{ color: "red" }}>{error}</p>}
      <form onSubmit={handleSubmit}>
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <input
            name="firstName"
            placeholder="First Name"
            value={form.firstName}
            onChange={handleChange}
            required
            style={{ flex: 1, padding: 8 }}
          />
          <input
            name="lastName"
            placeholder="Last Name"
            value={form.lastName}
            onChange={handleChange}
            required
            style={{ flex: 1, padding: 8 }}
          />
        </div>
        <div style={{ marginBottom: 12 }}>
          <input
            name="email"
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={handleChange}
            required
            style={{ width: "100%", padding: 8 }}
          />
          {iiit && (
            <p style={{ fontSize: 13, color: "#4f46e5", margin: "4px 0 0" }}>
              ✓ IIIT email detected — college set to IIIT Hyderabad
            </p>
          )}
        </div>
        <div style={{ marginBottom: 12 }}>
          <input
            name="password"
            type="password"
            placeholder="Password"
            value={form.password}
            onChange={handleChange}
            required
            style={{ width: "100%", padding: 8 }}
          />
        </div>
        <div style={{ marginBottom: 12, position: "relative" }} ref={collegeRef}>
          <input
            name="college"
            placeholder="College / Organization Name"
            value={form.college}
            onChange={handleChange}
            onFocus={() => {
              if (form.college.length > 0 && collegeSuggestions.length > 0) setShowSuggestions(true);
            }}
            readOnly={iiit}
            autoComplete="off"
            style={{
              width: "100%", padding: 8,
              background: iiit ? "#f0f0f0" : "#fff",
              boxSizing: "border-box",
            }}
          />
          {showSuggestions && !iiit && (
            <ul style={{
              position: "absolute", top: "100%", left: 0, right: 0,
              background: "#fff", border: "1px solid #ccc", borderTop: "none",
              maxHeight: 220, overflowY: "auto", margin: 0, padding: 0,
              listStyle: "none", zIndex: 99, boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
            }}>
              {collegeSuggestions.map((c) => (
                <li
                  key={c}
                  onMouseDown={() => {
                    setForm((prev) => ({ ...prev, college: c }));
                    setShowSuggestions(false);
                  }}
                  style={{
                    padding: "8px 12px", cursor: "pointer", fontSize: 14,
                    borderBottom: "1px solid #f0f0f0",
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = "#f5f3ff"}
                  onMouseLeave={(e) => e.currentTarget.style.background = "#fff"}
                >
                  {c}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: "flex", gap: 8 }}>
            <select
              name="countryCode"
              value={form.countryCode}
              onChange={handleChange}
              style={{ padding: 8, minWidth: 140 }}
            >
              {countryCodes.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code} {c.country}
                </option>
              ))}
            </select>
            <input
              name="phoneNumber"
              placeholder={expectedLen ? `${expectedLen} digit number` : "Phone Number"}
              value={form.phoneNumber}
              onChange={(e) => {
                // Allow only digits
                const val = e.target.value.replace(/\D/g, "");
                handleChange({ target: { name: "phoneNumber", value: val } });
              }}
              maxLength={expectedLen || 15}
              style={{ flex: 1, padding: 8 }}
            />
          </div>
          {phoneError && (
            <p style={{ fontSize: 12, color: "#dc2626", margin: "4px 0 0" }}>{phoneError}</p>
          )}
          {!phoneError && form.phoneNumber && expectedLen && form.phoneNumber.length === expectedLen && (
            <p style={{ fontSize: 12, color: "green", margin: "4px 0 0" }}>✓ Valid length</p>
          )}
        </div>
        <button type="submit" style={{ width: "100%", padding: 10 }}>
          Register
        </button>
      </form>
      <p style={{ marginTop: 12 }}>
        Already have an account? <Link to="/login">Login</Link>
      </p>
    </div>
  );
}
