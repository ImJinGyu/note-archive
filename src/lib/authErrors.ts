const ERROR_MAP: Record<string, string> = {
  // 인증
  'Invalid login credentials': '이메일 또는 비밀번호가 올바르지 않습니다.',
  'Email not confirmed': '이메일 인증이 완료되지 않았습니다. 받은 편지함을 확인해주세요.',
  'User already registered': '이미 가입된 이메일입니다.',
  'User not found': '존재하지 않는 계정입니다.',
  'Email rate limit exceeded': '이메일 전송 한도를 초과했습니다. 잠시 후 다시 시도해주세요.',
  'email rate limit exceeded': '이메일 전송 한도를 초과했습니다. 잠시 후 다시 시도해주세요.',
  'over_email_send_rate_limit': '이메일 전송 한도를 초과했습니다. 잠시 후 다시 시도해주세요.',
  'For security purposes, you can only request this after': '보안을 위해 잠시 후 다시 시도해주세요.',
  'Token has expired or is invalid': '링크가 만료되었거나 유효하지 않습니다. 다시 요청해주세요.',
  'Password should be at least 6 characters': '비밀번호는 최소 6자 이상이어야 합니다.',
  'Password should be at least': '비밀번호는 최소 6자 이상이어야 합니다.',
  'Signup requires a valid password': '유효한 비밀번호를 입력해주세요.',
  'Unable to validate email address: invalid format': '올바른 이메일 형식을 입력해주세요.',
  'AuthSessionMissingError': '세션이 만료되었습니다. 다시 로그인해주세요.',
  'Auth session missing': '세션이 만료되었습니다. 다시 로그인해주세요.',
  // MFA
  'MFA factor not found': 'MFA 설정을 찾을 수 없습니다.',
  'Invalid TOTP code': '인증 코드가 올바르지 않습니다.',
  'TOTP code expired': '인증 코드가 만료되었습니다. 새 코드를 입력해주세요.',
  // 일반
  'Network request failed': '네트워크 오류가 발생했습니다. 연결을 확인해주세요.',
  'Failed to fetch': '네트워크 오류가 발생했습니다. 연결을 확인해주세요.',
  'Internal server error': '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
  'duplicate key value violates unique constraint': '이미 존재하는 데이터입니다.',
  'new row violates row-level security policy': '접근 권한이 없습니다.',
  'JWT expired': '세션이 만료되었습니다. 다시 로그인해주세요.',
}

export function translateError(msg: string): string {
  if (!msg) return '오류가 발생했습니다.'
  // 정확히 일치하는 경우
  if (ERROR_MAP[msg]) return ERROR_MAP[msg]
  // 부분 일치 검색
  for (const [key, value] of Object.entries(ERROR_MAP)) {
    if (msg.toLowerCase().includes(key.toLowerCase())) return value
  }
  return msg
}
