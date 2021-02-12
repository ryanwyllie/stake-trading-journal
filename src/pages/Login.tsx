import React, { useRef, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { joiResolver } from "@hookform/resolvers/joi";
import Joi from "joi";
import { useAsyncState } from "../libs/hooks/general";

import H1 from "../components/headings/H1";
import Input from "../components/form/Input";
import PrimaryButton from "../components/buttons/Primary";
import { login } from "../libs/clients/stake";
import { useHistory } from "react-router-dom";

type FormValues = {
  email: string;
  password: string;
  otp?: string;
};

const formSchema = Joi.object({
  email: Joi.string().required().email({ tlds: false }),
  password: Joi.string().required(),
  otp: Joi.string(),
});

const LoginPage: React.FC = () => {
  const history = useHistory();
  const [requiresOtp, setRequiresOtp] = useState(false);
  const emailRef = useRef<HTMLInputElement | null>(null);
  const { register, errors, formState, handleSubmit } = useForm<FormValues>({
    criteriaMode: "all",
    resolver: joiResolver(formSchema),
  });
  const {
    loading,
    loadingText,
    setLoading,
    error,
    setError,
    clearError,
  } = useAsyncState();

  useEffect(() => {
    if (emailRef && emailRef.current) {
      emailRef.current.focus();
    }
  }, []);

  const onSubmit = async (data: FormValues) => {
    if (requiresOtp && !data.otp) {
      setError({
        title: "MFA Required",
        message: "You need to supply the verifcation code",
      });
      return;
    }

    clearError();
    setLoading(true);

    try {
      const user = await login(
        data.email,
        data.password,
        data.otp ? data.otp : undefined
      );

      if (user === null) {
        setRequiresOtp(true);
        setLoading(false);
      } else {
        window.localStorage.setItem("user", JSON.stringify(user));
        history.push("/");
      }
    } catch (e) {
      setError({
        title: "Login failed",
        message: e.message,
      });
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center w-screen h-screen pt-20">
      <H1>Stake trading journal</H1>
      {error({ className: "mt-4" })}
      <form
        className="mt-12"
        onSubmit={handleSubmit(onSubmit)}
        style={{ width: 400 }}
      >
        <Input
          ref={(ref) => {
            register(ref);
            emailRef.current = ref;
          }}
          name="email"
          type="text"
          error={!!errors.email}
          placeholder="Email"
        />
        <Input
          ref={register}
          className="mt-2"
          type="password"
          name="password"
          error={!!errors.password}
          placeholder="Password"
        />
        {requiresOtp && (
          <Input
            ref={register}
            className="mt-2"
            name="otp"
            error={!!errors.password}
            placeholder="Verification code"
          />
        )}
        <PrimaryButton
          className="mt-6 w-full text-xl text-white"
          type="submit"
          disabled={loading}
        >
          {loadingText({
            loading: "Logging in...",
            default: "Log in",
          })}
        </PrimaryButton>
      </form>
    </div>
  );
};

export default LoginPage;
