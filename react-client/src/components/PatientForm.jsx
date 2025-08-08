import { useState } from 'react';

export default function PatientForm({ onSave }) {
  const [formData, setFormData] = useState({
    fullName: '', gender: '', age: '', address: '',
    phone: '', email: '', title: '', profession: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-md mx-auto text-left">
      {['fullName', 'gender', 'age', 'address', 'phone', 'email', 'title', 'profession'].map((field) => (
        <div key={field} className="mb-4">
          <label className="block mb-1 capitalize">{field}</label>
          <input
            required={['fullName', 'gender', 'age', 'email', 'phone'].includes(field)}
            type="text"
            name={field}
            value={formData[field]}
            onChange={handleChange}
            className="w-full p-2 border rounded"
          />
        </div>
      ))}
      <button type="submit" className="w-full bg-green-600 text-white p-2 rounded">Save & Start Chat</button>
    </form>
  );
}
