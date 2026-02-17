/**
 * ImageSizeTune — Editor.js Block Tune for image sizing.
 * Adds Small (33%) / Medium (66%) / Full (100%) presets to the image block settings menu.
 * The selected size is saved in block.tunes.imageSize and read by BlockRenderer.
 */

const SIZE_STYLES = {
  small: { maxWidth: '33%', margin: '0 auto' },
  medium: { maxWidth: '66%', margin: '0 auto' },
  full: { maxWidth: '', margin: '' },
};

export default class ImageSizeTune {
  static get isTune() {
    return true;
  }

  constructor({ data, api, block }) {
    this.api = api;
    this.block = block;
    this.data = data || { size: 'full' };
    this.wrapper = null;
  }

  static get SIZES() {
    return [
      { value: 'small', label: 'Small'},
      { value: 'medium', label: 'Medium' },
      { value: 'full', label: 'Full'},
    ];
  }

  wrap(blockContent) {
    this.wrapper = document.createElement('div');
    this.wrapper.appendChild(blockContent);
    this._applySize();
    return this.wrapper;
  }

  // Apply the selected size styles to the wrapper
  _applySize() {
    if (!this.wrapper) return;
    const styles = SIZE_STYLES[this.data.size] || SIZE_STYLES.full;
    this.wrapper.style.maxWidth = styles.maxWidth;
    this.wrapper.style.margin = styles.margin;
  }

  // Method allows to define tune’s appearance inside Block Tunes menu.
  // Here we create buttons for each size option and handle their click events to update the tune data and apply styles.
  render() {
    const container = document.createElement('div');
    container.classList.add('image-size-tune');

    ImageSizeTune.SIZES.forEach(({ value, label }) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = label;
      button.classList.add('cdx-settings-button', 'image-size-tune__button');
      if (this.data.size === value) {
        button.classList.add('cdx-settings-button--active');
      }

      button.addEventListener('click', () => {
        this.data.size = value;
        this._applySize();

        container.querySelectorAll('.cdx-settings-button').forEach((btn) => {
          btn.classList.remove('cdx-settings-button--active');
        });
        button.classList.add('cdx-settings-button--active');

        // Trigger onChange so the editor knows data changed
        this.api.saver.save();
      });

      container.appendChild(button);
    });

    return container;
  }

  save() {
    return this.data;
  }
}
