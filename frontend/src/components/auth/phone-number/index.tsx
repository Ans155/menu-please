import { Controller, useForm } from "react-hook-form";
import { yupResolver } from '@hookform/resolvers/yup';
import { useNavigate } from "react-router-dom";
import { AUTH_PHONE_SCHEMA } from "../../../helpers/validation-schema";
import { REGEX } from "../../../constants/regex";
import { toastSuccess } from "../../../components/toast";
import Button from "../../../components/common/button";
import Input from "../../../components/common/input";
import { CountrySelector } from "../../common/country-selector";
import React, { useState } from "react";
import { COUNTRIES, SelectMenuOption } from "../../common/country-selector/countries";

const AuthPhoneNumber = () => {
    const navigate = useNavigate();

    type MobileFormData = {
        mobile: string;
        countryCode: string;
    };

    const addPhoneNumberPrefix = (value: string, countryCode: string) => {
        return countryCode + value;
    };

    const [selectedCountry, setSelectedCountry] = useState<SelectMenuOption>(COUNTRIES[0]);
    const [countrySelectorOpen, setCountrySelectorOpen] = useState(false);

    const { handleSubmit, formState: { errors, isSubmitting }, control } = useForm<MobileFormData>({
        mode: 'onSubmit',
        reValidateMode: 'onChange',
        resolver: yupResolver(AUTH_PHONE_SCHEMA),
        defaultValues: {
            mobile: "",
            countryCode: COUNTRIES[0].code
        }
    });

    const validatePhoneRegex = (value: string) => REGEX.NUMBER_KEY_PRESS.test(value);

    const onSubmit = async (data: MobileFormData) => {
        const phoneNo = addPhoneNumberPrefix(data?.mobile, data?.countryCode)
        try {
            const response = await fetch('http://localhost:8000/auth/otp/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ phone: phoneNo }),
            });
            const result = await response.json();

            if (result.success) {
                toastSuccess({ message: result.data.message });
                navigate(`/auth-otp/${phoneNo}`);
            } else {
                console.error(result.message);
            }
        } catch (error) {
            console.error("An error occurred:", error);
        }
    };

    return (
        <div className="flex h-screen bg-black">
            <div className="w-full lg:w-4/12 bg-black my-16 ml-16 mr-20 max-lg:ml-10 max-lg:mr-14 max-md:ml-6 max-md:mr-10">
                <form className="flex h-full flex-col justify-between" onSubmit={handleSubmit(onSubmit)}>
                    <div>
                        <img src="/assets/logo/serv.png" className="mb-20 h-[32px]" alt="Groo Logo" />
                        <div className="text-3xl text-white leading-10 font-bold mb-10">
                            Enter your mobile number to get OTP
                        </div>
                        <div className="flex items-start w-full ">
                            <Controller
                                name="countryCode"
                                control={control}
                                render={({ field: { value, onChange } }) => (
                                    <CountrySelector
                                        id="country-selector"
                                        open={countrySelectorOpen}
                                        onToggle={() => setCountrySelectorOpen(!countrySelectorOpen)}
                                        onChange={(selectedValue) => {
                                            onChange(selectedValue);
                                            setSelectedCountry(COUNTRIES.find((c) => c.code === selectedValue) || COUNTRIES[0]);
                                            setCountrySelectorOpen(false);
                                        }}
                                        selectedValue={COUNTRIES.find((c) => c.code === value) || COUNTRIES[0]}
                                    />
                                )}
                            />
                            <div className="ml-2 w-full rounded-xl">
                                <Controller
                                    name="mobile"
                                    control={control}
                                    rules={{ required: true }}
                                    render={({ field: { value, onChange } }) => (
                                        <Input
                                            id="mobile"
                                            name="mobile"
                                            customClassName="bg-[#262626] text-white px-3 rounded-xl"
                                            validate={validatePhoneRegex}
                                            maxLength={10}
                                            showError={true}
                                            errorMessage={errors?.mobile?.message}
                                            value={value}
                                            onChange={onChange}
                                            placeholder="1234567890"
                                        />
                                    )}
                                />
                            </div>
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
                            <a href="#" className="text-white">Terms & Conditions</a>
                            &
                            <a href="#" className="text-white">Privacy Policy</a>
                        </div>
                    </div>
                </form>
            </div>
            <div
                className="w-full lg:w-8/12 max-lg:hidden bg-[#1849D6] h-full flex flex-col gap-16"
                style={{ backgroundImage: `url('/assets/auth/Checks.svg')`, backgroundRepeat: 'no-repeat', backgroundSize: 'cover' }}
            >
                <div className="mx-[209px] mt-[89px] text-5xl lg:text-7xl font-semibold text-white text-center">
                    Your AI Foodie
                </div>
                <div className="mx-[166px] text-white lg:text-[24px] text-[16px] text-center">
                    Serv is a super-smart AI that answers your questions and helps you discover culinary delights from around the world.
                </div>
                <div className="w-full flex justify-center">
                    <img alt="Robot" src="/assets/icon/Robot.svg" width={400} height={400} />
                </div>
            </div>
        </div>
    );
};

export default AuthPhoneNumber;
