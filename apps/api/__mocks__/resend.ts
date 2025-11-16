export const sendEmailMock = {
  emails: {
    send: jest.fn(),
  },
};

export const Resend = jest.fn().mockImplementation(() => sendEmailMock);
