import React, { useState, useContext, useEffect } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import FormInput from '../../components/formInput/formInput';
import Button from '../../components/Button/Button';
import Alert from '../../components/Alert/Alert';
import api from '../../services/api';

import './Profile.css';

const Profile = () => {
  const { user, updateUser } = useContext(AuthContext);
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    salary: user?.salary || ''
  });
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
  }, [user, navigate]);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const res = await api.put(`/users/${user.id}`, {
        name: form.name,
        phone: form.phone,
        salary: form.salary
      });

      // 🔥 Update AuthContext + localStorage
      const updatedUser = res.data;
      updateUser(updatedUser);
      setMessage("Profile updated successfully ✅");


    } catch (err) {
      setMessage("Failed to update profile ❌");
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="profile">
      <h1>Your Profile</h1>
      {message && <Alert type="success" message={message} onClose={() => setMessage(null)} />}
      <form onSubmit={handleSubmit}>
        <FormInput
          label="Name"
          type="text"
          name="name"
          value={form.name}
          onChange={handleChange}
          placeholder="Update your name"
        />
        <FormInput
          label="Email"
          type="email"
          name="email"
          value={form.email}
          disabled
        />

        <FormInput
          label="Phone"
          type="text"
          name="phone"
          value={form.phone}
          onChange={handleChange}
        />

        <FormInput
          label="Salary"
          type="number"
          name="salary"
          value={form.salary}
          onChange={handleChange}
        />

        <Button type="submit" variant="primary" disabled={loading}>
          {loading ? 'Updating...' : 'Update Profile'}
        </Button>
      </form>
    </div>
  );
};

export default Profile;
