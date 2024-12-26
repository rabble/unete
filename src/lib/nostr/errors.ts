export class NostrError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NostrError';
  }
}

export class SignerRequiredError extends NostrError {
  constructor() {
    super('NDK signer required to create organization');
    this.name = 'SignerRequiredError';
  }
}

export class ValidationError extends NostrError {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class PublishError extends NostrError {
  constructor(message: string) {
    super(message);
    this.name = 'PublishError';
  }
}
