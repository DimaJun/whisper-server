import { CookieOptions } from 'express';

export const setSessionIdCookie: CookieOptions = {
    httpOnly: true,
    secure: false,
    sameSite: 'strict',
    maxAge: 2 * 24 * 60 * 60 * 1000,
};

export const clearSessionIdCookie: CookieOptions = {
    httpOnly: true,
    secure: false,
    sameSite: 'strict',
    maxAge: 0,
};
