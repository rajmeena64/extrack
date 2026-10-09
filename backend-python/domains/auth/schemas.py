import re
from typing import Optional
from pydantic import BaseModel, field_validator
from core.errors.messages import ERROR_MESSAGES

EMAIL_REGEX = re.compile(r"^[\w\.-]+@[\w\.-]+\.\w+$")

def clean_email(v: Optional[str]) -> Optional[str]:
    if v is None:
        return None
    val = v.strip().lower()
    if not val or not EMAIL_REGEX.match(val):
        raise ValueError(ERROR_MESSAGES["AUTH"]["INVALID_EMAIL"]["message"])
    return val

class LoginRequest(BaseModel):
    email: Optional[str] = None
    phone: Optional[str] = None
    password: str

    @field_validator("email")
    def validate_email(cls, v: Optional[str]) -> Optional[str]:
        return clean_email(v)

class SignupRequest(BaseModel):
    email: str
    password: Optional[str] = None
    name: Optional[str] = None
    firstName: Optional[str] = None
    lastName: Optional[str] = None
    phone: Optional[str] = None
    mobile: Optional[str] = None

    @field_validator("email")
    def validate_email(cls, v: str) -> str:
        return clean_email(v)

    @field_validator("password")
    def validate_password(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and not v.strip():
            raise ValueError(ERROR_MESSAGES["AUTH"]["WEAK_PASSWORD"]["message"])
        return v

class CompleteRegistrationRequest(BaseModel):
    token: str
    password: str
    confirmPassword: Optional[str] = None
    name: Optional[str] = None
    firstName: Optional[str] = None
    lastName: Optional[str] = None
    mobile: Optional[str] = None

    @field_validator("password")
    def validate_pwd(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError(ERROR_MESSAGES["AUTH"]["WEAK_PASSWORD"]["message"])
        return v

class RefreshTokenRequest(BaseModel):
    refreshToken: Optional[str] = None

class ChangePasswordRequest(BaseModel):
    currentPassword: str
    newPassword: str

class UpdateProfileRequest(BaseModel):
    firstName: Optional[str] = None
    lastName: Optional[str] = None
    phone: Optional[str] = None
    preferred_currency: Optional[str] = None

class ForgotPasswordRequest(BaseModel):
    email: str

class VerifyResetOtpRequest(BaseModel):
    email: str
    otp: str

class ResetPasswordRequest(BaseModel):
    email: Optional[str] = None
    otp: Optional[str] = None
    resetToken: Optional[str] = None
    password: Optional[str] = None
    newPassword: Optional[str] = None

class ResendVerificationRequest(BaseModel):
    email: str

class DeleteAccountRequest(BaseModel):
    password: str
