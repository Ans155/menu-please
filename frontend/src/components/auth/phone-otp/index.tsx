import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import {jwtDecode} from 'jwt-decode';
import { AUTH_PHONE_OTP_SCHEMA } from '../../../helpers/validation-schema';
import { fetchUserDetails } from '../../../store/slices/userSlice';
import { getCookies, handleStoreCookie, setCookies, removeAllCookies } from '../../../helpers/storage';
import Button from '../../../components/common/button';
import Input from '../../../components/common/input';
import { AppDispatch } from '../../../store/store';

interface JwtPayload {
    _id: string;
}

const AuthPhoneOTP = () => {
    const [resendTimer, setOtpTimer] = useState(0);
    const [shakeInputs, setShakeInputs] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [otpErrorMessage, setOtpErrorMessage] = useState<string | null>(null);
    const navigate = useNavigate();
    const dispatch = useDispatch<AppDispatch>();
    const { phone } = useParams<{ phone: string }>();

    type OTPFormData = {
        otp: string;
    };

    useEffect(() => {
        const currentTimerValue = Number(getCookies(STORAGE.OTP_TIMER)) || 0;
        setOtpTimer(currentTimerValue);
    }, []);

    useEffect(() => {
        handleOTPResendTimer(resendTimer);
    }, [resendTimer]);

    const STORAGE = {
        OTP_TIMER: 'OTP_TIMER'
    };

    const addPhoneNumberPrefix = (value: any) => {
        return "91" + value;
    }

    const handleOTPResendTimer = (time: number) => {
        if (time) {
            setTimeout(() => {
                const timer = resendTimer - 1;
                const updatedTimer = timer < 10 ? `0${timer}` : timer;
                setOtpTimer(Number(updatedTimer));
                setCookies(STORAGE.OTP_TIMER, updatedTimer);
            }, 1000);
        }
    };

    const { handleSubmit, formState: { errors, isSubmitting }, watch, setValue } = useForm<OTPFormData>({
        mode: 'onSubmit',
        reValidateMode: 'onChange',
        resolver: yupResolver(AUTH_PHONE_OTP_SCHEMA),
        defaultValues: {
            otp: ""
        }
    });

    const otpValue: string = watch('otp') || "";

    useEffect(() => {
        if (otpValue.length === 4) {
            handleSubmit(onSubmit)();
        }
    }, [otpValue]);

    const onSubmit = async (data: OTPFormData) => {
        try {
            const response = await fetch('http://localhost:8000/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ otp: data.otp, phone: `${phone}` }),
            });
            const result = await response.json();
            if (result.success) {
                const { access_token, refresh_token } = result.data || {};
                handleStoreCookie(access_token, refresh_token);
                if (access_token) {
                    let decoded = jwtDecode(access_token) as JwtPayload;
                    const user_id = decoded._id;
                    if (user_id) {
                        const userResponse = await dispatch(fetchUserDetails(user_id));
                        const userDetails = userResponse.payload;
                        if (!userDetails?.data?.is_onboarded) {
                            removeAllCookies();
                            setErrorMessage('To access Groo, please complete the onboarding process on the 1% app first.');
                            return;
                        }
                    }
                }

                navigate('/');
            } else {
                setOtpErrorMessage("OTP incorrect, please try again.")
                setShakeInputs(true);
                setTimeout(() => setShakeInputs(false), 500); 
            }
        } catch (error) {
            setOtpErrorMessage("OTP incorrect, please try again.")
            setShakeInputs(true);
            setTimeout(() => setShakeInputs(false), 500);
        }
    };

    const handleOTPChange = (value: string, index: number) => {
        if (/^[0-9]$/.test(value) || value === '') {
            const newOtp = otpValue.split('');
            newOtp[index] = value;
            const otpString = newOtp.join('');
            setValue('otp', otpString);
            if (value !== '' && index < 3) {
                const nextInput = document.getElementById(`otp-${index + 1}`);
                if (nextInput) nextInput.focus();
            } else if (value === '' && index > 0) {
                const prevInput = document.getElementById(`otp-${index - 1}`);
                if (prevInput) prevInput.focus();
            }
        }
    };

    const resendOTP = async () => {
        try {
            const response = await fetch('http://localhost:8000/auth/otp/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ phone: addPhoneNumberPrefix(phone) }),
            });
            const result = await response.json();
            if (result.success) {
                setOtpTimer(30);
                setCookies(STORAGE.OTP_TIMER, 30);
            } else {
                console.error('Failed to resend OTP:', result.message);
            }
        } catch (error) {
            console.error('An error occurred:', error);
        }
    };

    return (
        <div className="flex h-screen bg-black">
            <div className="w-full lg:w-4/12 bg-black my-16 ml-16 mr-20 max-lg:ml-10 max-lg:mr-14 max-md:ml-6 max-md:mr-10">
                <form className="flex h-full flex-col justify-between" onSubmit={handleSubmit(onSubmit)}>
                    <div>
                        <img src="/assets/logo/serv.png" className="mb-20 h-[32px]" alt="Groo Logo" />
                        <div className="text-3xl text-white leading-10 font-bold mb-10">
                            Enter the code sent to you at {phone}
                        </div>
                        <div className="flex items-start">
                            {[...Array(4)].map((_, index) => (
                                <Input
                                    key={index}
                                    id={`otp-${index}`}
                                    type="text"
                                    maxLength={1}
                                    className={`md:w-[100px] w-16 h-12 text-center rounded-md mr-1 bg-[#262626] text-white pr-2 outline-none focus:placeholder-transparent
                                        ${shakeInputs? 'border-2 border-[#EE4D37] animate-shake' : ''}`}
                                    value={watch('otp')?.[index] || ''}
                                    onChange={(value: string) => handleOTPChange(value, index)}
                                    placeholder="0"
                                />
                            ))}
                        </div>
                        {otpErrorMessage ? (
                            <div className="text-[#EE4D37] text-xs my-3">{otpErrorMessage}</div>
                        ) : null}
                        {errorMessage && (
                            <div className="text-red-500 text-xs my-3">
                                {errorMessage} <a href="https://dev.app.onepercentclub.io/auth/phone-number" className="text-blue-500 hover:underline">Complete onboarding</a>
                            </div>
                        )}
                        <div className="text-gray-400 text-xs mt-3 flex">
                            Didn’t receive it? {resendTimer ? `Retry in 00:${resendTimer}` :
                                <div onClick={resendOTP} className="text-blue-500 cursor-pointer hover:text-blue-600">&nbsp; Resend</div>}
                        </div>
                    </div>
                    <div>
                        <Button
                            isSubmitting={isSubmitting}
                            customClasses="w-full mb-5 rounded-xl"
                        >
                            Next
                        </Button>
                        <div className="text-gray-400 text-xs justify-center items-center flex flex-wrap text-center gap-1">
                            By clicking, I accept the
                            <a href="https://www.onepercentclub.io/terms-and-condition" className="text-white">Terms & Conditions</a>
                            &
                            <a href="https://www.onepercentclub.io/privacy-policy" className="text-white">Privacy Policy</a>
                        </div>
                    </div>
                </form>
            </div>
            <div
                className="w-full lg:w-8/12 max-lg:hidden bg-[#1849D6] h-full flex flex-col gap-16"
                style={{ backgroundImage: `url('/assets/auth/Checks.svg')`, backgroundRepeat: 'no-repeat', backgroundSize: 'cover' }}
            >
                <div className="mx-[209px] mt-[89px] text-5xl lg:text-7xl font-semibold text-white text-center">
                    Your AI Guru
                </div>
                <div className="mx-[166px] text-white lg:text-[24px] text-[16px] text-center">
                    Groo is a super-smart AI that answers your questions and helps you master what you've learned at Money School.
                </div>
                <div className="w-full flex justify-center">
                    <img alt="Robot" src="/assets/icon/Robot.svg" width={400} height={400} />
                </div>
            </div>
        </div>
    );
};

export default AuthPhoneOTP;
