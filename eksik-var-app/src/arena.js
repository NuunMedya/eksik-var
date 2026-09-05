// 🧠 Arena — futbol bilgi bankası + saf oyun mantığı.
// Sorular zamansız gerçekler: tarih, kurallar, efsaneler (güncel sıralama/şampiyon yok).
export const SORULAR = [
  { q: "İlk Dünya Kupası hangi ülkede düzenlendi?", s: ["Brezilya", "Uruguay", "İtalya", "İngiltere"], d: 1 },
  { q: "Penaltı noktası kaleye kaç metre uzaklıktadır?", s: ["9 m", "10 m", "11 m", "12 m"], d: 2 },
  { q: "Bir futbol takımı sahaya en az kaç oyuncuyla çıkabilir?", s: ["6", "7", "8", "9"], d: 1 },
  { q: "Pelé kaç Dünya Kupası kazandı?", s: ["1", "2", "3", "4"], d: 2 },
  { q: "2002 Dünya Kupası'nda Türkiye kaçıncı oldu?", s: ["Birinci", "İkinci", "Üçüncü", "Dördüncü"], d: 2 },
  { q: "Maradona'nın 'Tanrının Eli' golü hangi yıl atıldı?", s: ["1982", "1986", "1990", "1994"], d: 1 },
  { q: "VAR kısaltmasının açılımı nedir?", s: ["Video Asistan Referee", "Video Assistant Referee", "Visual Analysis Replay", "Video Analiz Raporu"], d: 1 },
  { q: "Standart bir maç kaç dakika sürer (uzatmalar hariç)?", s: ["80", "85", "90", "95"], d: 2 },
  { q: "2022 Dünya Kupası'nı hangi ülke kazandı?", s: ["Fransa", "Brezilya", "Arjantin", "Almanya"], d: 2 },
  { q: "Zidane 2006 finalinde kime kafa attı?", s: ["Cannavaro", "Materazzi", "Gattuso", "Pirlo"], d: 1 },
  { q: "Ofsayt hangi durumda GEÇERSİZDİR?", s: ["Taç atışında", "Serbest vuruşta", "Korner sonrası", "Uzun pasta"], d: 0 },
  { q: "Bir takımda aynı anda en fazla kaç oyuncu sahada olur?", s: ["10", "11", "12", "13"], d: 1 },
  { q: "'Hat-trick' ne demektir?", s: ["3 asist", "3 gol", "3 kurtarış", "3 maç serisi"], d: 1 },
  { q: "Kale çizgisi ile ceza sahası çizgisi arası kaç metredir?", s: ["11 m", "14,5 m", "16,5 m", "18 m"], d: 2 },
  { q: "Brezilya kaç Dünya Kupası kazanmıştır?", s: ["3", "4", "5", "6"], d: 2 },
  { q: "Messi ilk Dünya Kupası'nı hangi yıl kazandı?", s: ["2014", "2018", "2022", "2010"], d: 2 },
  { q: "Kırmızı kart gören oyuncunun yerine ne olur?", s: ["Yedek girer", "Takım eksik oynar", "Maç durur", "Penaltı olur"], d: 1 },
  { q: "Korner bayrağının bulunduğu yay kaç metre yarıçaplıdır?", s: ["0,5 m", "1 m", "1,5 m", "2 m"], d: 1 },
  { q: "'Panenka' neyi tarif eder?", s: ["Kafa golü", "Bekleyerek ortadan penaltı", "Röveşata", "Topuk pası"], d: 1 },
  { q: "1954'te 'Bern Mucizesi'ni yaşayan ülke hangisidir?", s: ["Macaristan", "Batı Almanya", "Brezilya", "İtalya"], d: 1 },
  { q: "Johan Cruyff hangi ülkenin efsanesidir?", s: ["Belçika", "Danimarka", "Hollanda", "Almanya"], d: 2 },
  { q: "Bir maçta hakem kaç yardımcıyla çizgide çalışır?", s: ["1", "2", "3", "4"], d: 1 },
  { q: "Golden Goal (altın gol) kuralı ne zaman geçerliydi?", s: ["Normal sürede", "Uzatmalarda", "Penaltılarda", "İlk yarıda"], d: 1 },
  { q: "Türkiye 2008 Avrupa Şampiyonası'nda hangi aşamaya kaldı?", s: ["Çeyrek final", "Yarı final", "Final", "Grup"], d: 1 },
  { q: "Kaleci penaltıda topa vurulmadan önce nerede durmalıdır?", s: ["Ceza sahasında", "Kale çizgisinde", "Penaltı noktasında", "İstediği yerde"], d: 1 },
  { q: "'Röveşata' hangi hareketi tanımlar?", s: ["Topuğa vuruş", "Havada makasla vuruş", "Dış aşırtma", "Kayarak müdahale"], d: 1 },
  { q: "Dünya Kupası kaç yılda bir düzenlenir?", s: ["2", "3", "4", "5"], d: 2 },
  { q: "Bir futbol topunun çevresi yaklaşık kaç cm'dir?", s: ["58-60", "68-70", "78-80", "88-90"], d: 1 },
  { q: "'Süper kupa' genelde hangi iki kazanan arasında oynanır?", s: ["Lig 1.-2.si", "Lig ve kupa şampiyonu", "Kupa finalistleri", "İki lig lideri"], d: 1 },
  { q: "1930 ilk Dünya Kupası'nı kim kazandı?", s: ["Arjantin", "Uruguay", "Brezilya", "İtalya"], d: 1 },
  { q: "Faul sonrası hızlı kullanılan vuruşa ne denir?", s: ["Endirekt", "Çabuk serbest vuruş", "Avantaj", "Duran top"], d: 1 },
  { q: "Sarı kart gören oyuncu ikinci sarıda ne olur?", s: ["Uyarılır", "Kırmızı görür", "Değişir", "Ceza sahasına giremez"], d: 1 },
  { q: "Kale kaç metre genişliğindedir?", s: ["6,32", "7,32", "8,32", "9,32"], d: 1 },
  { q: "'Tiki-taka' hangi ekolle özdeşleşmiştir?", s: ["İtalya", "İspanya", "İngiltere", "Almanya"], d: 1 },
  { q: "Bir maçta standart devre arası kaç dakikadır?", s: ["10", "15", "20", "25"], d: 1 },
  { q: "Eusebio hangi ülkenin efsanesidir?", s: ["İspanya", "Brezilya", "Portekiz", "Fransa"], d: 2 },
  { q: "Penaltı atışında top nereden kullanılır?", s: ["Kale önünden", "Penaltı noktasından", "Ceza yayından", "6 pastan"], d: 1 },
  { q: "Futbolda 'asist' ne demektir?", s: ["Gol pası", "Korner", "Uzun top", "Şut"], d: 0 },
  { q: "1966 Dünya Kupası'nı ev sahibi olarak kim kazandı?", s: ["Almanya", "İngiltere", "Fransa", "Brezilya"], d: 1 },
  { q: "Bir oyuncu taç atışını nasıl kullanmalıdır?", s: ["Tek elle", "İki elle baş üstünden", "Ayakla", "Dizden"], d: 1 },
];

export const karistir = (dizi, rng = Math.random) => {
  const a = [...dizi];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
};
export const soruSec = (adet, rng = Math.random) => karistir(SORULAR, rng).slice(0, adet);
export const dogruMu = (soru, secim) => secim === soru.d;
export const SURE_SN = 12;
