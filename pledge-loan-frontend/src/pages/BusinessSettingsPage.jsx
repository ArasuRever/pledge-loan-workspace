import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Save, CheckCircle2 } from 'lucide-react';

export default function BusinessSettingsPage() {
  const [settings, setSettings] = useState({
    business_name: '',
    address: '',
    phone_number: '',
    license_number: '',
    navbar_display_mode: 'both'
  });
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    api.get('/api/settings')
      .then((res) => {
        if (res.data) {
          setSettings(res.data);
          if (res.data.logo_url) setLogoPreview(res.data.logo_url);
        }
      })
      .catch((err) => console.error("Failed to load settings:", err))
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSuccess(false);

    const formData = new FormData();
    formData.append('business_name', settings.business_name);
    formData.append('address', settings.address || '');
    formData.append('phone_number', settings.phone_number || '');
    formData.append('license_number', settings.license_number || '');
    formData.append('navbar_display_mode', settings.navbar_display_mode || 'both');
    if (logoFile) formData.append('logo', logoFile);
    if (settings.logo_url) formData.append('existingLogoUrl', settings.logo_url);

    try {
      const res = await api.put('/api/settings', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setSettings(res.data);
      if (res.data.logo_url) setLogoPreview(res.data.logo_url);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      alert("Failed to save settings.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="py-12 text-center text-slate-400 text-sm">Loading settings...</div>;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Business Settings & Branding</h2>
        <p className="text-sm text-slate-500">Configure business identity, print headers, and logo.</p>
      </div>

      {success && (
        <div className="flex items-center space-x-2 p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm rounded-xl">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Settings saved successfully!</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
        <div>
          <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Business Name *</label>
          <input
            type="text"
            required
            value={settings.business_name}
            onChange={(e) => setSettings({ ...settings, business_name: e.target.value })}
            className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-semibold"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Head Office Address</label>
          <textarea
            rows="2"
            value={settings.address}
            onChange={(e) => setSettings({ ...settings, address: e.target.value })}
            className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-sm"
          ></textarea>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Contact Phone</label>
            <input
              type="text"
              value={settings.phone_number}
              onChange={(e) => setSettings({ ...settings, phone_number: e.target.value })}
              className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Money Lending License #</label>
            <input
              type="text"
              value={settings.license_number}
              onChange={(e) => setSettings({ ...settings, license_number: e.target.value })}
              className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Business Logo</label>
          {logoPreview && (
            <img src={logoPreview} alt="Logo" className="w-16 h-16 object-contain rounded-lg border border-slate-200 mb-2 p-1" />
          )}
          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files[0] || null;
              setLogoFile(file);
              if (file) setLogoPreview(URL.createObjectURL(file));
            }}
            className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700"
          />
        </div>

        <div className="pt-4 border-t border-slate-100 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center space-x-2 px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-sm shadow-xs transition"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? "Saving..." : "Save Changes"}</span>
          </button>
        </div>
      </form>
    </div>
  );
}