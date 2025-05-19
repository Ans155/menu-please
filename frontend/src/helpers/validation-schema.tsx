import * as yup from 'yup';
import { REGEX } from '../constants/regex';


export const AUTH_PHONE_SCHEMA = yup.object().shape({
  mobile: yup.string().required("Mobile number is required").matches(/^\d{10}$/, "Mobile number must be 10 digits"),
  countryCode: yup.string().required("Country code is required"),
});

export const AUTH_PHONE_OTP_SCHEMA = yup.object().shape({
    otp: yup
        .string()
        .length(4, 'OTP must be exactly 4 digits')
        .required('OTP is required'),
});

