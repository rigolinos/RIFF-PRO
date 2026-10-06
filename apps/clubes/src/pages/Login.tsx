import { LoginScreen } from '@riff/core/auth/LoginScreen';
import { BRAND } from '@/brand';

const Login = () => <LoginScreen product={BRAND.name} home="/inicio" subtitle="É a mesma conta do Riff Pro." />;

export default Login;
