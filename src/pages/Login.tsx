import { LoginScreen } from '@riff/core/auth/LoginScreen';
import { BRAND } from '@/brand';

const Login = () => <LoginScreen product={BRAND.name} home="/home" subtitle="Entre para reservar suas vagas e organizar suas atividades." />;

export default Login;
