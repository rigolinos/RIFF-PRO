import { DeleteAccountInfo } from '@riff/core/legal/DeleteAccountInfo';
import { BRAND } from '@/brand';

const STEPS = [
  'Abra o Riff Pro e entre na sua conta.',
  'Abra o seu perfil.',
  'Desça até o fim da tela e toque em "Excluir minha conta".',
  'Digite EXCLUIR para confirmar.',
];

const DeleteAccountInfoPage = () => <DeleteAccountInfo appName={BRAND.name} otherAppName="Riff Clubes" steps={STEPS} />;

export default DeleteAccountInfoPage;
