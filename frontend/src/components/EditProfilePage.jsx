import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Camera, ChevronLeft } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { userService } from '../services/userService';
import Breadcrumbs from './ui/Breadcrumbs';

const uploadToSpaces = async (presignedData, file) => {
  const formData = new FormData();

  Object.entries(presignedData.fields).forEach(([key, value]) => {
    formData.append(key, value);
  });

  formData.append('file', file);

  try {
    const response = await fetch(presignedData.url, {
      method: 'POST',
      body: formData,
    });
    return response.status === 204 || response.ok;
  } catch (error) {
    console.error('Upload to Spaces failed:', error);
    return false;
  }
};

const EditProfilePage = () => {
  const { user, refreshAuthState } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [profileImagePreview, setProfileImagePreview] = useState('');
  const [profileImageKey, setProfileImageKey] = useState('');
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    username: '',
    bio: '',
    facebook_url: '',
    instagram_url: '',
    twitter_url: '',
    tiktok_url: '',
  });

  useEffect(() => {
    if (!user?.username) {
      setLoading(false);
      return;
    }

    const loadProfile = async () => {
      setLoading(true);
      const result = await userService.getUserProfile(user.username);
      if (result.success) {
        setProfile(result.data);
        setFormData({
          first_name: result.data.first_name || '',
          last_name: result.data.last_name || '',
          username: result.data.username || '',
          bio: result.data.bio || '',
          facebook_url: result.data.facebook_url || '',
          instagram_url: result.data.instagram_url || '',
          twitter_url: result.data.twitter_url || '',
          tiktok_url: result.data.tiktok_url || '',
        });
      } else {
        toast.error(result.error || 'Failed to load profile');
      }
      setLoading(false);
    };

    loadProfile();
  }, [user?.username]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image must be under 10MB');
      return;
    }

    setUploadingImage(true);
    const presignResult = await userService.presignProfileImageUpload(file.type);

    if (!presignResult.success) {
      toast.error(presignResult.error || 'Failed to prepare upload');
      setUploadingImage(false);
      return;
    }

    const uploadSuccess = await uploadToSpaces(presignResult.data.upload, file);
    if (!uploadSuccess) {
      toast.error('Upload failed. Please try again.');
      setUploadingImage(false);
      return;
    }

    setProfileImagePreview(presignResult.data.url);
    setProfileImageKey(presignResult.data.name);
    setUploadingImage(false);
  };

  const handleCancel = () => {
    const fallbackHandle = profile?.username || user?.username || '';
    if (fallbackHandle) {
      navigate(`/profile/${fallbackHandle}`);
    } else {
      navigate(-1);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!user?.username) {
      toast.error('Unable to update profile right now');
      return;
    }

    if (uploadingImage) {
      toast.error('Please wait for the image upload to finish');
      return;
    }

    if (!formData.username.trim()) {
      toast.error('Username is required');
      return;
    }

    setSaving(true);
    const payload = {
      username: formData.username.trim(),
      first_name: formData.first_name.trim(),
      last_name: formData.last_name.trim(),
      bio: formData.bio,
      facebook_url: formData.facebook_url,
      instagram_url: formData.instagram_url,
      twitter_url: formData.twitter_url,
      tiktok_url: formData.tiktok_url,
    };

    if (profileImageKey) {
      payload.profile_image_key = profileImageKey;
    }

    const result = await userService.updateProfile(user.username, payload);
    if (result.success) {
      toast.success('Profile updated successfully');
      setProfile(result.data);
      await refreshAuthState();
      navigate(`/profile/${result.data.username}`);
    } else {
      toast.error(result.error || 'Failed to update profile');
    }
    setSaving(false);
  };

  const inputClassName = 'w-full p-3 border-2 border-[var(--border-color-line)] rounded-input focus:outline-none focus:ring-2 focus:ring-[var(--primary-color-royal)] focus:border-[var(--primary-color-royal)] bg-[var(--color-white)] text-[var(--text-color-ink)] text-base transition-all duration-200';
  const labelClassName = 'text-[var(--text-color-ink)] font-semibold block mb-2';

  const displayImage = useMemo(() => {
    if (profileImagePreview) return profileImagePreview;
    if (profile?.profile_image) return profile.profile_image;
    return '';
  }, [profile?.profile_image, profileImagePreview]);

  const displayInitial = useMemo(() => {
    const nameSource = formData.first_name || profile?.full_name || user?.full_name || 'U';
    return nameSource.trim().charAt(0).toUpperCase();
  }, [formData.first_name, profile?.full_name, user?.full_name]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--color-background-snow)] font-ui">
        <div className="pt-20 pb-16 px-4">
          <div className="max-w-5xl mx-auto">
            <div className="mb-6">
              <Breadcrumbs />
            </div>
            <div className="flex justify-center items-center py-20">
              <div className="w-8 h-8 border-4 border-[var(--primary-color-royal)] border-t-transparent rounded-full animate-spin"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-background-snow)] font-ui">
      <div className="pt-20 pb-16 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="mb-6">
            <Breadcrumbs />
          </div>

          <div className="mb-8">
            <button
              onClick={handleCancel}
              className="flex items-center gap-2 text-[var(--primary-color-royal)] hover:text-[var(--primary-color-royal-600)] font-medium transition-colors mb-4"
            >
              <ChevronLeft className="w-5 h-5" /> Back to Profile
            </button>
            <h1 className="text-4xl font-bold text-[var(--text-color-ink)] font-editorial">
              Edit Profile
            </h1>
            <p className="text-[var(--text-color-ink-400)] mt-2">
              Update your profile and social links
            </p>
          </div>

          <div className="bg-[var(--color-white)] rounded-card shadow-card p-8">
            <form onSubmit={handleSubmit} className="grid gap-10 lg:grid-cols-[240px_1fr]">
              <div className="space-y-4">
                <div className="relative mx-auto w-40 h-40">
                  {displayImage ? (
                    <img
                      src={displayImage}
                      alt="Profile preview"
                      className="w-40 h-40 rounded-full object-cover border-4 border-white shadow-lg"
                    />
                  ) : (
                    <div className="w-40 h-40 rounded-full bg-gradient-to-br from-[var(--primary-color-royal)] to-[var(--secondary-color-orchid)] border-4 border-white shadow-lg flex items-center justify-center">
                      <span className="text-white text-5xl font-bold">{displayInitial}</span>
                    </div>
                  )}
                  <label
                    htmlFor="profile_image"
                    className="absolute -bottom-2 -right-2 bg-[var(--color-gold)] text-[var(--text-color-ink)] rounded-full p-2 shadow-card cursor-pointer hover:bg-[var(--color-gold-600)] transition-colors"
                  >
                    <Camera className="w-4 h-4" />
                  </label>
                  <input
                    id="profile_image"
                    name="profile_image"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageChange}
                  />
                </div>
                <div className="text-center">
                  <p className="text-sm text-[var(--text-color-ink-400)]">
                    {uploadingImage ? 'Uploading image...' : 'JPG, PNG, or WEBP up to 10MB'}
                  </p>
                </div>
              </div>

              <div className="space-y-8">
                <div>
                  <h2 className="text-xl font-semibold text-[var(--text-color-ink)]">
                    Profile Information
                  </h2>
                  <div className="mt-4 grid gap-6 md:grid-cols-2">
                    <div>
                      <label htmlFor="first_name" className={labelClassName}>First Name</label>
                      <input
                        id="first_name"
                        name="first_name"
                        type="text"
                        value={formData.first_name}
                        onChange={handleChange}
                        className={inputClassName}
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="last_name" className={labelClassName}>Last Name</label>
                      <input
                        id="last_name"
                        name="last_name"
                        type="text"
                        value={formData.last_name}
                        onChange={handleChange}
                        className={inputClassName}
                        required
                      />
                    </div>
                    <div>
                      <label className={labelClassName}>Username</label>
                      <div className="w-full rounded-input border border-[var(--border-color-line)] bg-[var(--color-background-snow)] px-4 py-3 text-[var(--text-color-ink-400)]">
                        {formData.username || '—'}
                      </div>
                    </div>
                    <div>
                      <label className={labelClassName}>Email</label>
                      <div className="w-full rounded-input border border-[var(--border-color-line)] bg-[var(--color-background-snow)] px-4 py-3 text-[var(--text-color-ink-400)]">
                        {profile?.email || user?.email || '—'}
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h2 className="text-xl font-semibold text-[var(--text-color-ink)]">
                    Bio
                  </h2>
                  <div className="mt-4">
                    <textarea
                      id="bio"
                      name="bio"
                      rows={4}
                      value={formData.bio}
                      onChange={handleChange}
                      className={`${inputClassName} resize-none`}
                      placeholder="Share a short bio"
                    />
                  </div>
                </div>

                <div>
                  <h2 className="text-xl font-semibold text-[var(--text-color-ink)]">
                    Social Links
                  </h2>
                  <div className="mt-4 grid gap-6 md:grid-cols-2">
                    <div>
                      <label htmlFor="instagram_url" className={labelClassName}>Instagram</label>
                      <input
                        id="instagram_url"
                        name="instagram_url"
                        type="url"
                        value={formData.instagram_url}
                        onChange={handleChange}
                        className={inputClassName}
                        placeholder="https://instagram.com/yourname"
                      />
                    </div>
                    <div>
                      <label htmlFor="twitter_url" className={labelClassName}>X (Twitter)</label>
                      <input
                        id="twitter_url"
                        name="twitter_url"
                        type="url"
                        value={formData.twitter_url}
                        onChange={handleChange}
                        className={inputClassName}
                        placeholder="https://x.com/yourname"
                      />
                    </div>
                    <div>
                      <label htmlFor="facebook_url" className={labelClassName}>Facebook</label>
                      <input
                        id="facebook_url"
                        name="facebook_url"
                        type="url"
                        value={formData.facebook_url}
                        onChange={handleChange}
                        className={inputClassName}
                        placeholder="https://facebook.com/yourname"
                      />
                    </div>
                    <div>
                      <label htmlFor="tiktok_url" className={labelClassName}>TikTok</label>
                      <input
                        id="tiktok_url"
                        name="tiktok_url"
                        type="url"
                        value={formData.tiktok_url}
                        onChange={handleChange}
                        className={inputClassName}
                        placeholder="https://tiktok.com/@yourname"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-[var(--border-color-line)] flex flex-col sm:flex-row gap-3">
                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full sm:w-auto px-6 py-3 bg-[var(--primary-color-royal)] text-white rounded-input font-semibold hover:bg-[var(--primary-color-royal-600)] transition-colors disabled:opacity-60"
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="w-full sm:w-auto px-6 py-3 border border-[var(--border-color-line)] text-[var(--text-color-ink)] rounded-input font-medium hover:bg-[var(--color-background-snow)] transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditProfilePage;
