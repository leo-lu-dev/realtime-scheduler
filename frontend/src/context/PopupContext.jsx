import { createContext, useContext, useState } from 'react';

const PopupContext = createContext();

export const PopupProvider = ({ children }) => {
  const [method, setmethod] = useState(null);

  const openPopup = (type) => setmethod(type);
  const closePopup = () => setmethod(null);

  return (
    <PopupContext.Provider value={{ method, openPopup, closePopup }}>
      {children}
    </PopupContext.Provider>
  );
};

export const usePopup = () => useContext(PopupContext);
