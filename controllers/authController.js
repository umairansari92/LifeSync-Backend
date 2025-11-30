import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";

export default function Register() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    firstname: "",
    lastname: "",
    email: "",
    password: "",
    phone: "",
    dob: "",
  });

  const [image, setImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleImagePreview = (file) => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const data = new FormData();
    data.append("firstname", formData.firstname);
    data.append("lastname", formData.lastname);
    data.append("email", formData.email);
    data.append("password", formData.password);
    data.append("phone", formData.phone);
    data.append("dob", formData.dob);
    if (image) data.append("image", image);

    try {
      const res = await api.post("/auth/register", data, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setMessage(res.data.message);

      // Navigate to OTP verification page after short delay
      setTimeout(
        () => navigate("/verify-otp", { state: { email: formData.email } }),
        1500
      );
    } catch (err) {
      setMessage(err.response?.data?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#0b0b0c] px-4">
      <div className="w-full max-w-md bg-white/5 backdrop-blur-md rounded-2xl shadow-lg p-8 border border-[#f5c54240]">
        <h2 className="text-3xl font-bold text-center mb-6 text-[#f5c542]">
          Create Your Account
        </h2>

        {message && (
          <p
            className={`text-center mb-4 text-sm font-medium ${
              message.toLowerCase().includes("failed")
                ? "text-red-400"
                : "text-[#e8b43c]"
            }`}
          >
            {message}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex gap-3">
            <input
              type="text"
              name="firstname"
              placeholder="First Name"
              value={formData.firstname}
              onChange={handleChange}
              required
              className="w-1/2 px-3 py-2 rounded-lg bg-white/5 border border-[#f5c54240] text-[#e5e5e5] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#f5c542] transition"
            />
            <input
              type="text"
              name="lastname"
              placeholder="Last Name"
              value={formData.lastname}
              onChange={handleChange}
              required
              className="w-1/2 px-3 py-2 rounded-lg bg-white/5 border border-[#f5c54240] text-[#e5e5e5] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#f5c542] transition"
            />
          </div>

          <input
            type="email"
            name="email"
            placeholder="Email Address"
            value={formData.email}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-[#f5c54240] text-[#e5e5e5] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#f5c542] transition"
          />

          <input
            type="password"
            name="password"
            placeholder="Password"
            value={formData.password}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-[#f5c54240] text-[#e5e5e5] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#f5c542] transition"
          />

          <input
            type="tel"
            name="phone"
            placeholder="Phone Number"
            value={formData.phone}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-[#f5c54240] text-[#e5e5e5] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#f5c542] transition"
          />

          <input
            type="date"
            name="dob"
            value={formData.dob}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-[#f5c54240] text-[#e5e5e5] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#f5c542] transition"
          />

          <div className="flex flex-col items-center gap-3">
            {previewUrl && (
              <img
                src={previewUrl}
                className="w-20 h-20 rounded-full object-cover border-2"
                style={{ borderColor: "#f5c542" }}
              />
            )}
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                setImage(e.target.files[0]);
                handleImagePreview(e.target.files[0]);
              }}
              className="w-full text-sm text-gray-300"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-2 rounded-lg font-semibold text-[#0b0b0c] transition ${
              loading
                ? "bg-[#f5c54280] cursor-not-allowed"
                : "bg-[#f5c542] hover:bg-[#e8b43c]"
            }`}
          >
            {loading ? "Registering..." : "Register"}
          </button>
        </form>

        <p className="text-sm text-center mt-5 text-[#e5e5e5]">
          Already have an account?
          <span
            onClick={() => navigate("/")}
            className="ml-1 cursor-pointer font-medium text-[#f5c542] hover:underline"
          >
            Login
          </span>
        </p>
      </div>
    </div>
  );
}
