import { useState, useEffect, useRef } from 'react';
import { register, type RegisterData } from '../services/authService';
import axios, { type AxiosError } from 'axios';
import './Register.css';
import './Auth.css';

interface RegisterProps {
  onSuccess: () => void;
  onSwitchToLogin: () => void;
}

function Register({ onSuccess, onSwitchToLogin }: RegisterProps) {
  const [formData, setFormData] = useState<RegisterData>({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    password_confirmation: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirmation, setShowPasswordConfirmation] = useState(false);
  const errorRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (error && errorRef.current) {
      errorRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      errorRef.current.focus({ preventScroll: true });
    }
  }, [error]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Client-side validation
    if (!agreeToTerms) {
      setError('You must agree to terms & conditions');
      return;
    }

    if (formData.password !== formData.password_confirmation) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    // Check password strength requirements
    const hasUpperCase = /[A-Z]/.test(formData.password);
    const hasLowerCase = /[a-z]/.test(formData.password);
    const hasNumber = /[0-9]/.test(formData.password);
    const hasSpecialChar = /[@$!%*#?&]/.test(formData.password);

    if (!hasUpperCase || !hasLowerCase || !hasNumber || !hasSpecialChar) {
      setError('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*#?&)');
      return;
    }

    if (!formData.first_name.trim()) {
      setError('First name is required');
      return;
    }

    if (!formData.last_name.trim()) {
      setError('Last name is required');
      return;
    }

    setLoading(true);

    try {
      await register(formData);
      onSuccess();
    } catch (err: unknown) {
      console.error('Registration error:', err);
      
      // Check if it's an Axios error using axios's built-in method
      if (axios.isAxiosError(err)) {
        const axiosError = err as AxiosError<{ message?: string; errors?: Record<string, string[]> }>;
        
        // Check if there's a response (server responded with error)
        if (axiosError.response) {
          const data = axiosError.response.data as any;
          
          // Handle validation errors
          if (data?.errors) {
            const errorMessages = Object.values(data.errors).flat();
            setError(errorMessages.join(', '));
          } 
          // Handle general error message
          else if (data?.message) {
            setError(data.message);
          } 
          // Handle HTTP status errors
          else {
            const status = axiosError.response.status;
            if (status === 422) {
              setError('Validation failed. Please check your input.');
            } else if (status === 500) {
              setError('Server error. Please try again later.');
            } else {
              setError(`Registration failed (${status}). Please try again.`);
            }
          }
        } 
        // Network error (no response from server)
        else if (axiosError.code === 'ERR_NETWORK' || axiosError.code === 'ERR_CONNECTION_REFUSED') {
          setError('Cannot connect to server. Please check your internet connection and ensure the backend is running.');
        } else if (axiosError.code === 'ECONNABORTED') {
          setError('Request timed out. Please try again.');
        } else if (axiosError.request) {
          setError('Network error. Please check if the backend server is running.');
        } 
        // Request setup error
        else {
          setError('Request error. Please try again.');
        }
      } 
      // Non-Axios error
      else if (err instanceof Error) {
        setError(err.message || 'An unexpected error occurred.');
      } 
      else {
        setError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="_social_registration_wrapper _layout_main_wrapper">
      <div className="_shape_one">
        <img src="/assets/images/shape1.svg" alt="" className="_shape_img" />
        <img src="/assets/images/dark_shape.svg" alt="" className="_dark_shape" />
      </div>
      <div className="_shape_two">
        <img src="/assets/images/shape2.svg" alt="" className="_shape_img" />
        <img src="/assets/images/dark_shape1.svg" alt="" className="_dark_shape _dark_shape_opacity" />
      </div>
      <div className="_shape_three">
        <img src="/assets/images/shape3.svg" alt="" className="_shape_img" />
        <img src="/assets/images/dark_shape2.svg" alt="" className="_dark_shape _dark_shape_opacity" />
      </div>
      <div className="_social_registration_wrap">
        <div className="container">
          <div className="row align-items-center">
            <div className="col-xl-8 col-lg-8 col-md-12 col-sm-12">
              <div className="_social_registration_right">
                <div className="_social_registration_right_image">
                  <img src="/assets/images/registration.png" alt="Image" />
                </div>
                <div className="_social_registration_right_image_dark">
                  <img src="/assets/images/registration1.png" alt="Image" />
                </div>
              </div>
            </div>
            <div className="col-xl-4 col-lg-4 col-md-12 col-sm-12">
              <div className="_social_registration_content">
                <div className="_social_registration_right_logo _mar_b28">
                  <img src="/assets/images/logo.svg" alt="Image" className="_right_logo" />
                </div>
                <p className="_social_registration_content_para _mar_b8">Get Started Now</p>
                <h4 className="_social_registration_content_title _titl4 _mar_b50">Registration</h4>
                
                <button type="button" className="_social_registration_content_btn _mar_b40" disabled={loading}>
                  <img src="/assets/images/google.svg" alt="Image" className="_google_img" /> <span>Register with google</span>
                </button>
                
                <div className="_social_registration_content_bottom_txt _mar_b40">
                  <span>Or</span>
                </div>
                
                <form className="_social_registration_form" onSubmit={handleSubmit}>
                  {error && (
                    <div
                      ref={errorRef}
                      tabIndex={-1}
                      className="error-message"
                      style={{
                        marginBottom: '1rem',
                        padding: '0.75rem',
                        background: 'rgba(255, 107, 107, 0.2)',
                        border: '1px solid #ff6b6b',
                        color: '#ff6b6b',
                        borderRadius: '4px',
                        fontSize: '0.9em',
                      }}
                    >
                      {error}
                    </div>
                  )}
                  <div className="row">
                    <div className="col-xl-12 col-lg-12 col-md-12 col-sm-12">
                      <div className="_social_registration_form_input _mar_b14">
                        <label className="_social_registration_label _mar_b8">First Name</label>
                        <input
                          type="text"
                          className="form-control _social_registration_input"
                          value={formData.first_name}
                          onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                          required
                          disabled={loading}
                        />
                      </div>
                    </div>
                    <div className="col-xl-12 col-lg-12 col-md-12 col-sm-12">
                      <div className="_social_registration_form_input _mar_b14">
                        <label className="_social_registration_label _mar_b8">Last Name</label>
                        <input
                          type="text"
                          className="form-control _social_registration_input"
                          value={formData.last_name}
                          onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                          required
                          disabled={loading}
                        />
                      </div>
                    </div>
                    <div className="col-xl-12 col-lg-12 col-md-12 col-sm-12">
                      <div className="_social_registration_form_input _mar_b14">
                        <label className="_social_registration_label _mar_b8">Email</label>
                        <input
                          type="email"
                          className="form-control _social_registration_input"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          required
                          disabled={loading}
                        />
                      </div>
                    </div>
                    <div className="col-xl-12 col-lg-12 col-md-12 col-sm-12">
                      <div className="_social_registration_form_input _mar_b14">
                        <label className="_social_registration_label _mar_b8">Password</label>
                        <div style={{ position: 'relative' }}>
                          <input
                            type={showPassword ? "text" : "password"}
                            className="form-control _social_registration_input"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            required
                            minLength={8}
                            disabled={loading}
                            style={{ paddingRight: formData.password ? '45px' : '12px' }}
                          />
                          {formData.password && (
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              style={{
                                position: 'absolute',
                                right: '12px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                padding: '4px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#666',
                              }}
                              disabled={loading}
                              tabIndex={-1}
                            >
                              {showPassword ? (
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                  <circle cx="12" cy="12" r="3"></circle>
                                </svg>
                              ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                                  <line x1="1" y1="1" x2="23" y2="23"></line>
                                </svg>
                              )}
                            </button>
                          )}
                        </div>
                        <small style={{ color: '#666', fontSize: '0.85em', marginTop: '4px', display: 'block' }}>
                          Must contain: uppercase, lowercase, number, and special character (@$!%*#?&)
                        </small>
                      </div>
                    </div>
                    <div className="col-xl-12 col-lg-12 col-md-12 col-sm-12">
                      <div className="_social_registration_form_input _mar_b14">
                        <label className="_social_registration_label _mar_b8">Repeat Password</label>
                        <div style={{ position: 'relative' }}>
                          <input
                            type={showPasswordConfirmation ? "text" : "password"}
                            className="form-control _social_registration_input"
                            value={formData.password_confirmation}
                            onChange={(e) => setFormData({ ...formData, password_confirmation: e.target.value })}
                            required
                            disabled={loading}
                            style={{
                              paddingRight: formData.password_confirmation ? '45px' : '12px',
                              borderColor: formData.password_confirmation && formData.password
                                ? (formData.password === formData.password_confirmation ? '#28a745' : '#dc3545')
                                : undefined,
                              borderWidth: formData.password_confirmation && formData.password ? '2px' : undefined,
                              transition: 'border-color 0.3s ease',
                            }}
                          />
                          {formData.password_confirmation && (
                            <button
                              type="button"
                              onClick={() => setShowPasswordConfirmation(!showPasswordConfirmation)}
                              style={{
                                position: 'absolute',
                                right: '12px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                padding: '4px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#666',
                              }}
                              disabled={loading}
                              tabIndex={-1}
                            >
                              {showPasswordConfirmation ? (
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                  <circle cx="12" cy="12" r="3"></circle>
                                </svg>
                              ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                                  <line x1="1" y1="1" x2="23" y2="23"></line>
                                </svg>
                              )}
                            </button>
                          )}
                        </div>
                        {formData.password_confirmation && formData.password && (
                          <small style={{
                            color: formData.password === formData.password_confirmation ? '#28a745' : '#dc3545',
                            fontSize: '0.85em',
                            marginTop: '4px',
                            display: 'block',
                            fontWeight: '500',
                          }}>
                            {formData.password === formData.password_confirmation ? '✓ Passwords match' : '✗ Passwords do not match'}
                          </small>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="row">
                    <div className="col-lg-12 col-xl-12 col-md-12 col-sm-12">
                      <div className="form-check _social_registration_form_check">
                        <input
                          className="form-check-input _social_registration_form_check_input"
                          type="radio"
                          name="flexRadioDefault"
                          id="flexRadioDefault2"
                          checked={agreeToTerms}
                          onChange={(e) => setAgreeToTerms(e.target.checked)}
                          required
                          disabled={loading}
                        />
                        <label className="form-check-label _social_registration_form_check_label" htmlFor="flexRadioDefault2">
                          I agree to terms & conditions
                        </label>
                      </div>
                    </div>
                  </div>
                  <div className="row">
                    <div className="col-lg-12 col-md-12 col-xl-12 col-sm-12">
                      <div className="_social_registration_form_btn _mar_t40 _mar_b60">
                        <button type="submit" className="_social_registration_form_btn_link _btn1" disabled={loading || !agreeToTerms} style={{ whiteSpace: 'nowrap' }}>
                          {loading ? (
                            <>
                              <span className="_btn_loading_spinner"></span>
                              Registering...
                            </>
                          ) : (
                            'Login now'
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </form>
                
                <div className="row">
                  <div className="col-xl-12 col-lg-12 col-md-12 col-sm-12">
                    <div className="_social_registration_bottom_txt">
                      <p className="_social_registration_bottom_txt_para">
                        Already have an account?{' '}
                        <a href="/login" onClick={(e) => { e.preventDefault(); onSwitchToLogin(); }}>
                          Login here
                        </a>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Register;

