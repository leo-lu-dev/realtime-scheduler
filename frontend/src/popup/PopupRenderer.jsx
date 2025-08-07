import { usePopup } from './PopupContext';
import Popup from '../components/Popup';

export default function PopupManager() {
  const { popupState, closePopup } = usePopup();

  if (!popupState) return null;

  return (
    <Popup
      method={popupState.type}
      route={popupState.route}
      event={popupState.data}
      onSuccess={popupState.onSuccess}
      onClose={closePopup}
    />
  );
}
