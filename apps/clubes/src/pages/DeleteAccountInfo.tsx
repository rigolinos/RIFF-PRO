import { DeleteAccountInfo } from '@riff/core/legal/DeleteAccountInfo';
import { BRAND } from '@/brand';

const STEPS = [
  'Abra o Riff Clubes e entre na sua conta.',
  'Toque em Perfil, no menu de baixo.',
  'Desça até "Conta" e toque em "Excluir minha conta".',
  'Digite EXCLUIR para confirmar.',
];

const DeleteAccountInfoPage = () => <DeleteAccountInfo appName={BRAND.name} otherAppName="Riff Pro" steps={STEPS} />;

export default DeleteAccountInfoPage;
