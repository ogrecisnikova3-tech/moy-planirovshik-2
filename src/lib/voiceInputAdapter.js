export const voiceInputAdapter = {
  enabled: false,
  async transcribe() {
    throw new Error("Голосовой ввод запланирован для следующей версии.");
  }
};
