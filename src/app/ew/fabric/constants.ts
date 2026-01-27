export const DatePattern = 'yyyy-MM-dd';

export const BatchPattern = /^[a-zA-Z0-9/-]{1,20}$/;
// export const BatchPattern: RegExp;
export enum TableNames {
  Audit = 'audit',
  Batch = 'batch',
  GtinOwner = 'gtin_owner',
  Leaflet = 'leaflet',
  LeafletFile = 'leaflet_file',
  Product = 'product',
  Market = 'market',
  ProductStrength = 'product_strength',
  ProductImage = 'product_image',
}
export enum AuditOperations {
  REMOVE = 'Remove user',
  ADD = 'Add user',
  DEACTIVATE = 'Deactivate user',
  LOGIN = 'Access wallet',
  SHARED_ENCLAVE_CREATE = 'Create identity',
  BREAK_GLASS_RECOVERY = 'Wallet recovered with the break Glass Recovery Code',
  AUTHORIZE = 'Authorize integration user',
  REVOKE = 'Revoke integration user',
  USER_ACCESS = 'User Access wallet',
  DATA_RECOVERY = 'Use of the Data Recovery Key',
  RECOVERY_KEY_COPIED = 'Copy Data Recovery Key',
}
export enum UserGroup {
  ADMIN = 'admin',
  READ = 'read',
  WRITE = 'write',
}

export const BarcodeTypes = {
  gs1datamatrix: 'gs1datamatrix',
  datamatrix: 'datamatrix',
  qrcode: 'qrcode',
} as const;
