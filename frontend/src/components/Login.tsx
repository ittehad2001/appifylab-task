import { useState } from 'react';
import { login, type LoginCredentials } from '../services/authService';
import type { AxiosError } from 'axios';
import './Auth.css';
import './Login.css';

interface LoginProps {
  onSuccess: () => void;
  onSwitchToRegister: () => void;
}

function Login({ onSuccess, onSwitchToRegister }: LoginProps) {
  const [formData, setFormData] = useState<LoginCredentials>({
    email: '',
    password: '',
  });
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login(formData);
      onSuccess();
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'isAxiosError' in err) {
        const axiosError = err as AxiosError<{ message?: string; errors?: Record<string, string[]> }>;
        if (axiosError.response?.data) {
          const data = axiosError.response.data;
          if (data.errors) {
            // Handle account lockout and other errors
            const errorMessages = Object.values(data.errors).flat();
            setError(errorMessages.join(', '));
          } else if (data.message) {
            // Handle account lockout message specifically
            if (data.message.includes('locked')) {
              setError(data.message);
            } else {
              setError(data.message);
            }
          } else {
            setError('Login failed. Please check your credentials.');
          }
        } else if (axiosError.response?.status === 401) {
          setError('Invalid email or password. Please try again.');
        } else if (axiosError.response?.status === 429) {
          setError('Too many login attempts. Please wait a moment and try again.');
        } else if (axiosError.code === 'ERR_NETWORK' || axiosError.code === 'ERR_CONNECTION_REFUSED') {
          setError('Cannot connect to server. Please check your internet connection and ensure the backend is running.');
        } else if (axiosError.code === 'ECONNABORTED') {
          setError('Request timed out. Please try again.');
        } else {
          setError('Network error. Please try again.');
        }
      } else {
        setError('An unexpected error occurred.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="_social_login_wrapper _layout_main_wrapper">
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
      <div className="_social_login_wrap">
        <div className="container">
          <div className="row align-items-center">
            <div className="col-xl-8 col-lg-8 col-md-12 col-sm-12">
              <div className="_social_login_left">
                <div className="_social_login_left_image">
                  <img src="/assets/images/login.png" alt="Image" className="_left_img" />
                </div>
              </div>
            </div>
            <div className="col-xl-4 col-lg-4 col-md-12 col-sm-12">
              <div className="_social_login_content">
                <div className="_social_login_left_logo _mar_b28">
                  <img src="/assets/images/logo.svg" alt="Image" className="_left_logo" />
                </div>
                <p className="_social_login_content_para _mar_b8">Welcome back</p>
                <h4 className="_social_login_content_title _titl4 _mar_b50">Login to your account</h4>
                
                <button type="button" className="_social_login_content_btn _mar_b40" disabled={loading}>
                  <img src="/assets/images/google.svg" alt="Image" className="_google_img" /> <span>Or sign-in with google</span>
                </button>
                
                <div className="_social_login_content_bottom_txt _mar_b40">
                  <span>Or</span>
                </div>
                
                <form className="_social_login_form" onSubmit={handleSubmit}>
                  {error && <div className="error-message" style={{ marginBottom: '1rem', padding: '0.75rem', background: 'rgba(255, 107, 107, 0.2)', border: '1px solid #ff6b6b', color: '#ff6b6b', borderRadius: '4px', fontSize: '0.9em' }}>{error}</div>}
                  <div className="row">
                    <div className="col-xl-12 col-lg-12 col-md-12 col-sm-12">
                      <div className="_social_login_form_input _mar_b14">
                        <label className="_social_login_label _mar_b8">Email</label>
                        <input
                          type="email"
                          className="form-control _social_login_input"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          required
                          disabled={loading}
                        />
                      </div>
                    </div>
                    <div className="col-xl-12 col-lg-12 col-md-12 col-sm-12">
                      <div className="_social_login_form_input _mar_b14">
                        <label className="_social_login_label _mar_b8">Password</label>
                        <div style={{ position: 'relative' }}>
                          <input
                            type={showPassword ? "text" : "password"}
                            className="form-control _social_login_input"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            required
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
                      </div>
                    </div>
                  </div>
                  <div className="row">
                    <div className="col-lg-6 col-xl-6 col-md-6 col-sm-12">
                      <div className="form-check _social_login_form_check">
                        <input
                          className="form-check-input _social_login_form_check_input"
                          type="checkbox"
                          name="rememberMe"
                          id="rememberMe"
                          checked={rememberMe}
                          onChange={(e) => setRememberMe(e.target.checked)}
                          disabled={loading}
                        />
                        <label className="form-check-label _social_login_form_check_label" htmlFor="rememberMe">
                          Remember me
                        </label>
                      </div>
                    </div>
                    <div className="col-lg-6 col-xl-6 col-md-6 col-sm-12">
                      <div className="_social_login_form_left">
                        <p className="_social_login_form_left_para">Forgot password?</p>
                      </div>
                    </div>
                  </div>
                  <div className="row">
                    <div className="col-lg-12 col-md-12 col-xl-12 col-sm-12">
                      <div className="_social_login_form_btn _mar_t40 _mar_b60">
                        <button type="submit" className="_social_login_form_btn_link _btn1" disabled={loading}>
                          {loading ? (
                            <>
                              <span className="_btn_loading_spinner"></span>
                              Logging in...
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
                    <div className="_social_login_bottom_txt">
                      <p className="_social_login_bottom_txt_para">
                        Dont have an account?{' '}
                        <a href="/register" onClick={(e) => { e.preventDefault(); onSwitchToRegister(); }}>
                          Create New Account
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

export default Login;

