import { useState, useEffect, useRef } from 'react';
import { getCurrentUser } from '../services/authService';
import apiClient from '../services/api';
import './Profile.css';

interface ProfileProps {
  onBack: () => void;
  onUpdate?: () => void;
}

function Profile({ onBack, onUpdate }: ProfileProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
  });
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    new_password_confirmation: '',
  });
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      const user = await getCurrentUser();
      
      // Split name into first and last name
      const nameParts = user.name ? user.name.trim().split(' ') : ['', ''];
      setFormData({
        first_name: nameParts[0] || '',
        last_name: nameParts.slice(1).join(' ') || '',
        email: user.email || '',
      });
      
      // Set profile image if available (with cache-busting on initial load)
      if (user.profile_image_url) {
        let imageUrl = user.profile_image_url;
        
        // If URL is relative, make it absolute
        if (imageUrl.startsWith('/storage/')) {
          const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';
          const baseUrl = apiBaseUrl.replace('/api', '').replace(/\/$/, '');
          imageUrl = `${baseUrl}${imageUrl}`;
        }
        
        // Add timestamp to prevent caching on initial load
        const cacheBuster = `?t=${Date.now()}`;
        const finalUrl = imageUrl.includes('?') ? `${imageUrl}&_t=${Date.now()}` : `${imageUrl}${cacheBuster}`;
        setProfileImage(finalUrl);
      } else if (user.profile_image) {
        // Fallback to constructing URL if profile_image_url is not provided
        const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';
        const baseUrl = apiBaseUrl.replace('/api', '').replace(/\/$/, '');
        setProfileImage(`${baseUrl}/storage/${user.profile_image}?t=${Date.now()}`);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      setError('Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError(null);
    setSuccess(null);
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({ ...prev, [name]: value }));
    setError(null);
    setSuccess(null);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setError('Image size should be less than 2MB');
        return;
      }
      if (!file.type.startsWith('image/')) {
        setError('Please select a valid image file');
        return;
      }
      setProfileImageFile(file);
      setProfileImage(URL.createObjectURL(file));
      setError(null);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    // Validate form data
    const trimmedFirstName = formData.first_name.trim();
    const trimmedLastName = formData.last_name.trim();
    const trimmedEmail = formData.email.trim();

    if (!trimmedFirstName || !trimmedLastName || !trimmedEmail) {
      setError('All fields are required');
      setSaving(false);
      return;
    }

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('first_name', trimmedFirstName);
      formDataToSend.append('last_name', trimmedLastName);
      formDataToSend.append('email', trimmedEmail);
      formDataToSend.append('_method', 'PUT');
      
      if (profileImageFile) {
        console.log('Appending profile image file:', {
          name: profileImageFile.name,
          size: profileImageFile.size,
          type: profileImageFile.type,
          lastModified: profileImageFile.lastModified
        });
        formDataToSend.append('profile_image', profileImageFile, profileImageFile.name);
      } else {
        console.log('No profile image file to upload');
      }
      
      // Debug: Log all FormData entries
      console.log('FormData contents:');
      for (let pair of formDataToSend.entries()) {
        console.log(pair[0] + ': ', pair[1]);
      }

      // Don't set Content-Type header - let browser set it with boundary for FormData
      const response = await apiClient.post('/profile', formDataToSend);
      
      console.log('Profile update response:', response.data);

      setSuccess('Profile updated successfully!');
      
      // Revoke the blob URL if it was created from file selection
      if (profileImage && profileImage.startsWith('blob:')) {
        URL.revokeObjectURL(profileImage);
      }
      
      // Clear the file input and file state after successful upload
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      setProfileImageFile(null);
      
      // Update profile image immediately from response with cache-busting
      if (response.data.user?.profile_image_url) {
        let imageUrl = response.data.user.profile_image_url;
        console.log('Raw profile_image_url from response:', imageUrl);
        
        // If URL is relative (starts with /storage/ or storage/), make it absolute
        if (imageUrl.startsWith('/storage/') || imageUrl.startsWith('storage/')) {
          const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';
          const baseUrl = apiBaseUrl.replace('/api', '').replace(/\/$/, '');
          // Ensure we have the leading slash
          if (!imageUrl.startsWith('/')) {
            imageUrl = '/' + imageUrl;
          }
          imageUrl = `${baseUrl}${imageUrl}`;
          console.log('Converted to absolute URL:', imageUrl);
        }
        
        // Add timestamp to prevent caching
        const cacheBuster = `?t=${Date.now()}`;
        const finalUrl = imageUrl.includes('?') ? `${imageUrl}&_t=${Date.now()}` : `${imageUrl}${cacheBuster}`;
        console.log('Final profile image URL:', finalUrl);
        setProfileImage(finalUrl);
      } else if (response.data.user?.profile_image) {
        // Fallback: construct URL if profile_image_url is not provided
        const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';
        const baseUrl = apiBaseUrl.replace('/api', '').replace(/\/$/, '');
        const imageUrl = `${baseUrl}/storage/${response.data.user.profile_image}?t=${Date.now()}`;
        console.log('Setting profile image URL (constructed):', imageUrl);
        setProfileImage(imageUrl);
      }
      
      if (onUpdate) {
        onUpdate();
      }
      
      // Store the image URL we just set to prevent it from being overwritten
      const justSetImageUrl = response.data.user?.profile_image_url 
        ? (() => {
            let imgUrl = response.data.user.profile_image_url;
            if (imgUrl.startsWith('/storage/')) {
              const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';
              const baseUrl = apiBaseUrl.replace('/api', '').replace(/\/$/, '');
              imgUrl = `${baseUrl}${imgUrl}`;
            }
            const cacheBuster = `?t=${Date.now()}`;
            return imgUrl.includes('?') ? `${imgUrl}&_t=${Date.now()}` : `${imgUrl}${cacheBuster}`;
          })()
        : null;
      
      // Refresh user data to get latest info, but preserve the image we just set
      const user = await getCurrentUser();
      // Only update form data
      const nameParts = user.name ? user.name.trim().split(' ') : ['', ''];
      setFormData({
        first_name: nameParts[0] || '',
        last_name: nameParts.slice(1).join(' ') || '',
        email: user.email || '',
      });
      
      // Only update profile image if we didn't just set it (to prevent overwriting)
      // Compare the base URLs (without cache-busting parameters)
      if (justSetImageUrl) {
        // Extract base URL without query params for comparison
        const justSetBase = justSetImageUrl.split('?')[0];
        const currentUserBase = user.profile_image_url 
          ? (user.profile_image_url.startsWith('/storage/') 
              ? (() => {
                  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';
                  const baseUrl = apiBaseUrl.replace('/api', '').replace(/\/$/, '');
                  return `${baseUrl}${user.profile_image_url}`;
                })()
              : user.profile_image_url).split('?')[0]
          : null;
        
        // Only update if the image actually changed (different file)
        if (currentUserBase && currentUserBase !== justSetBase) {
          let imageUrl = user.profile_image_url;
          if (imageUrl.startsWith('/storage/')) {
            const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';
            const baseUrl = apiBaseUrl.replace('/api', '').replace(/\/$/, '');
            imageUrl = `${baseUrl}${imageUrl}`;
          }
          const cacheBuster = `?t=${Date.now()}`;
          const finalUrl = imageUrl.includes('?') ? `${imageUrl}&_t=${Date.now()}` : `${imageUrl}${cacheBuster}`;
          setProfileImage(finalUrl);
        }
        // Otherwise, keep the image we just set (don't overwrite)
      } else if (user.profile_image_url) {
        // No image was just uploaded, so update normally
        let imageUrl = user.profile_image_url;
        if (imageUrl.startsWith('/storage/')) {
          const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';
          const baseUrl = apiBaseUrl.replace('/api', '').replace(/\/$/, '');
          imageUrl = `${baseUrl}${imageUrl}`;
        }
        const cacheBuster = `?t=${Date.now()}`;
        const finalUrl = imageUrl.includes('?') ? `${imageUrl}&_t=${Date.now()}` : `${imageUrl}${cacheBuster}`;
        setProfileImage(finalUrl);
      } else if (user.profile_image && !user.profile_image_url) {
        const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';
        const baseUrl = apiBaseUrl.replace('/api', '').replace(/\/$/, '');
        const imageUrl = `${baseUrl}/storage/${user.profile_image}?t=${Date.now()}`;
        setProfileImage(imageUrl);
      }
    } catch (err: any) {
      console.error('Error updating profile:', err);
      if (err.response?.data?.errors) {
        const errors = err.response.data.errors;
        setError(Object.values(errors).flat().join(', '));
      } else if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else {
        setError('Failed to update profile. Please try again.');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    if (passwordData.new_password !== passwordData.new_password_confirmation) {
      setError('New passwords do not match');
      setSaving(false);
      return;
    }

    if (passwordData.new_password.length < 8) {
      setError('New password must be at least 8 characters');
      setSaving(false);
      return;
    }

    try {
      const response = await apiClient.put('/profile/password', passwordData);
      setSuccess('Password updated successfully!');
      setPasswordData({
        current_password: '',
        new_password: '',
        new_password_confirmation: '',
      });
      setShowPasswordSection(false);
    } catch (err: any) {
      console.error('Error updating password:', err);
      if (err.response?.data?.errors) {
        const errors = err.response.data.errors;
        setError(Object.values(errors).flat().join(', '));
      } else if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else {
        setError('Failed to update password. Please try again.');
      }
    } finally {
      setSaving(false);
    }
  };

  const getDefaultProfileImage = () => {
    return '/user.png';
  };

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const target = e.target as HTMLImageElement;
    if (target.src !== window.location.origin + '/user.png') {
      target.src = '/user.png';
    }
  };

  // Get user initials for avatar
  const getUserInitials = () => {
    const firstName = formData.first_name.trim();
    const lastName = formData.last_name.trim();
    if (firstName && lastName) {
      return (firstName[0] + lastName[0]).toUpperCase();
    }
    if (firstName) {
      return firstName[0].toUpperCase();
    }
    return 'U';
  };

  // Check if user has a custom profile image (not the default)
  const hasCustomImage = () => {
    if (!profileImage) return false;
    // Check if it's the default image path
    if (profileImage === '/user.png' || profileImage.includes('/user.png')) return false;
    // Check if it's a blob URL (temporary preview)
    if (profileImage.startsWith('blob:')) return true;
    // Check if it's a valid server URL
    if (profileImage.startsWith('http://') || profileImage.startsWith('https://') || profileImage.startsWith('/storage/')) return true;
    // Check if it's a valid URL (not just default)
    return true;
  };

  if (loading) {
    return (
      <div className="_profile_wrapper">
        <div className="_loading_wrapper">
          <div className="_loading_spinner">
            <div className="_spinner"></div>
          </div>
          <p className="_loading_text">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="_profile_wrapper">
      <div className="_profile_container">
        <div className="_profile_header">
          <button 
            type="button" 
            className="_profile_back_btn"
            onClick={onBack}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 16 16">
              <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 12l-4-4 4-4"/>
            </svg>
            Back
          </button>
          <h2 className="_profile_title">Profile Settings</h2>
        </div>

        <div className="_profile_content">
          {error && (
            <div className="_profile_error">
              {error}
            </div>
          )}
          {success && (
            <div className="_profile_success">
              {success}
            </div>
          )}

          <div className="_profile_layout">
            {/* Left Column - Profile Summary */}
            <div className="_profile_left_column">
              <div className="_profile_summary_card">
                <div className="_profile_avatar_wrapper">
                  {hasCustomImage() ? (
                    <img 
                      src={profileImage} 
                      alt="Profile" 
                      className="_profile_avatar_image"
                      onError={handleImageError}
                    />
                  ) : (
                    <img 
                      src={getDefaultProfileImage()} 
                      alt="Profile" 
                      className="_profile_avatar_image"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        // If default image fails, show initials
                        target.style.display = 'none';
                        const wrapper = target.parentElement;
                        if (wrapper) {
                          const initialsDiv = wrapper.querySelector('._profile_avatar_initials') as HTMLElement;
                          if (initialsDiv) {
                            initialsDiv.style.display = 'flex';
                          }
                        }
                      }}
                    />
                  )}
                  <div className="_profile_avatar_initials" style={{ display: hasCustomImage() ? 'none' : 'none' }}>
                    {getUserInitials()}
                  </div>
                  <button
                    type="button"
                    className="_profile_avatar_upload_btn"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 16 16">
                      <path stroke="#fff" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 2v12M2 8h12"/>
                    </svg>
                  </button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                    onChange={handleImageSelect}
                    style={{ display: 'none' }}
                  />
                </div>
                <h3 className="_profile_user_name">
                  {formData.first_name} {formData.last_name}
                </h3>
                <p className="_profile_membership">Premium Member</p>
                <div className="_profile_file_info">
                  <div className="_profile_file_info_item">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 16 16">
                      <path fill="#FFA500" d="M8 0L0 4v8l8 4 8-4V4L8 0z"/>
                    </svg>
                    <span>Accepted Files: JPG, PNG, GIF</span>
                  </div>
                  <div className="_profile_file_info_item">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 16 16">
                      <path fill="#666" d="M8 0a8 8 0 100 16A8 8 0 008 0z"/>
                    </svg>
                    <span>Max Size: 5MB</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Settings Cards */}
            <div className="_profile_right_column">
              {/* Personal Information Card */}
              <div className="_profile_settings_card">
                <div className="_profile_card_header">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 20 20">
                    <path fill="#8B5CF6" d="M10 0C4.477 0 0 4.477 0 10s4.477 10 10 10 10-4.477 10-10S15.523 0 10 0zm0 18c-4.418 0-8-3.582-8-8s3.582-8 8-8 8 3.582 8 8-3.582 8-8 8z"/>
                    <circle cx="10" cy="7" r="2" fill="#8B5CF6"/>
                    <path fill="#8B5CF6" d="M10 11c-2.5 0-4.5 1.5-4.5 3v1h9v-1c0-1.5-2-3-4.5-3z"/>
                  </svg>
                  <h4 className="_profile_card_title">Personal Information</h4>
                </div>
                <form onSubmit={handleUpdateProfile} className="_profile_form">
                  <div className="_profile_form_group">
                    <label className="_profile_label">First Name</label>
                    <input
                      type="text"
                      name="first_name"
                      className="_profile_input"
                      value={formData.first_name}
                      onChange={handleInputChange}
                      required
                      disabled={saving}
                    />
                  </div>
                  <div className="_profile_form_group">
                    <label className="_profile_label">Last Name</label>
                    <input
                      type="text"
                      name="last_name"
                      className="_profile_input"
                      value={formData.last_name}
                      onChange={handleInputChange}
                      required
                      disabled={saving}
                    />
                  </div>
                  <div className="_profile_form_group">
                    <label className="_profile_label">Email Address</label>
                    <input
                      type="email"
                      name="email"
                      className="_profile_input"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                      disabled={saving}
                    />
                  </div>
                  <button 
                    type="submit" 
                    className="_profile_submit_btn"
                    disabled={saving}
                  >
                    {saving ? 'Updating...' : 'Save Changes'}
                  </button>
                </form>
              </div>

              {/* Security Card */}
              <div className="_profile_settings_card">
                <div className="_profile_card_header">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 20 20">
                    <path fill="#8B5CF6" d="M10 0L2 4v6c0 5.55 3.84 10.74 8 12 4.16-1.26 8-6.45 8-12V4l-8-4zm0 18.5c-3.5-1.08-6-5.5-6-8.5V5.5l6-3 6 3v4.5c0 3-2.5 7.42-6 8.5z"/>
                    <path fill="#8B5CF6" d="M9 8h2v4H9V8zm0 6h2v2H9v-2z"/>
                  </svg>
                  <h4 className="_profile_card_title">Security</h4>
                </div>
                <p className="_profile_security_desc">
                  Keep your account secure by updating your password regularly
                </p>
                {showPasswordSection ? (
                  <form onSubmit={handleUpdatePassword} className="_profile_form">
                    <div className="_profile_form_group">
                      <label className="_profile_label">Current Password</label>
                      <input
                        type="password"
                        name="current_password"
                        className="_profile_input"
                        value={passwordData.current_password}
                        onChange={handlePasswordChange}
                        required
                        disabled={saving}
                      />
                    </div>
                    <div className="_profile_form_group">
                      <label className="_profile_label">New Password</label>
                      <input
                        type="password"
                        name="new_password"
                        className="_profile_input"
                        value={passwordData.new_password}
                        onChange={handlePasswordChange}
                        required
                        disabled={saving}
                        minLength={8}
                      />
                    </div>
                    <div className="_profile_form_group">
                      <label className="_profile_label">Confirm New Password</label>
                      <input
                        type="password"
                        name="new_password_confirmation"
                        className="_profile_input"
                        value={passwordData.new_password_confirmation}
                        onChange={handlePasswordChange}
                        required
                        disabled={saving}
                        minLength={8}
                      />
                    </div>
                    <div className="_profile_password_actions">
                      <button
                        type="button"
                        className="_profile_cancel_btn"
                        onClick={() => {
                          setShowPasswordSection(false);
                          setPasswordData({
                            current_password: '',
                            new_password: '',
                            new_password_confirmation: '',
                          });
                        }}
                      >
                        Cancel
                      </button>
                      <button 
                        type="submit" 
                        className="_profile_submit_btn"
                        disabled={saving}
                      >
                        {saving ? 'Updating...' : 'Update Password'}
                      </button>
                    </div>
                  </form>
                ) : (
                  <button
                    type="button"
                    className="_profile_update_password_btn"
                    onClick={() => setShowPasswordSection(true)}
                  >
                    Update Password
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Profile;

