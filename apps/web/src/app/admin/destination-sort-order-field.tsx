export function DestinationSortOrderField({ value = 0 }: { value?: number }) {
  return <label className="form-field">Urutan tampil<input name="sortOrder" type="number" min="0" max="2147483647" step="1" defaultValue={value} required /><small>Angka lebih kecil tampil lebih dulu.</small></label>;
}
