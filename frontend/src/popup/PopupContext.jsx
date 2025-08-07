import { createContext, useContext, useState } from 'react';

const PopupContext = createContext();

export const PopupProvider = ({ children }) => {
  const [popupState, setPopupState] = useState(null);

  const openPopup = (type, props = {}) => {
    setPopupState({ type, ...props });
  };

  const closePopup = () => setPopupState(null);

  return (
    <PopupContext.Provider value={{ popupState, openPopup, closePopup }}>
      {children}
    </PopupContext.Provider>
  );
};

export const usePopup = () => useContext(PopupContext);
