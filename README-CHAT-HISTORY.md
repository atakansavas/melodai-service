# Chat History API

Bu dokümantasyon, MelodAI Service'teki chat history API endpoint'inin kullanımını açıklar.

## Endpoint

```
GET /api/v1/chat/history
```

## Kimlik Doğrulama

Tüm istekler Authorization header ile Spotify access token'ı gerektirir:

```
Authorization: Bearer <spotify_access_token>
```

## Query Parametreleri

| Parametre | Tip     | Varsayılan | Açıklama |
|-----------|---------|------------|-----------|
| `page`    | number  | 1          | Sayfa numarası (1'den başlar) |
| `limit`   | number  | 20         | Sayfa başına kayıt sayısı (max: 50) |

## Örnek İstekler

### Basit İstek (İlk 20 kayıt)
```bash
curl -X GET "http://localhost:3000/api/v1/chat/history" \
  -H "Authorization: Bearer <your_spotify_token>"
```

### Sayfalama ile İstek
```bash
curl -X GET "http://localhost:3000/api/v1/chat/history?page=2&limit=10" \
  -H "Authorization: Bearer <your_spotify_token>"
```

## Yanıt Formatı

### Başarılı Yanıt (200)

```json
{
  "success": true,
  "data": {
    "sessions": [
      {
        "id": "uuid-session-id",
        "created_at": "2024-01-15T10:30:00Z",
        "updated_at": "2024-01-15T10:45:00Z",
        "message_count": 8,
        "last_message_at": "2024-01-15T10:45:00Z",
        "interaction_type": "general",
        "preview": {
          "first_user_message": "Merhaba, rock müziği önerir misin?",
          "last_message": "Tabii! İşte senin için harika rock şarkıları..."
        },
        "session_duration_ms": 900000
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 45,
      "hasMore": true
    }
  },
  "meta": {
    "requestId": "uuid-request-id",
    "responseTime": 150,
    "timestamp": "2024-01-15T11:00:00Z"
  }
}
```

### Session Objesi Açıklaması

- `id`: Chat session'ının benzersiz ID'si
- `created_at`: Session oluşturulma tarihi
- `updated_at`: Son güncelleme tarihi
- `message_count`: Session içindeki toplam mesaj sayısı
- `last_message_at`: Son mesajın gönderilme tarihi
- `interaction_type`: Etkileşim türü (general, chat, vb.)
- `preview`: Session'dan kısa örnek metinler
  - `first_user_message`: Kullanıcının ilk mesajı (100 karakter ile sınırlı)
  - `last_message`: Son mesaj (100 karakter ile sınırlı)
- `session_duration_ms`: Session süresi (milisaniye)

### Pagination Objesi

- `page`: Mevcut sayfa numarası
- `limit`: Sayfa başına kayıt sayısı
- `total`: Toplam kayıt sayısı (yaklaşık)
- `hasMore`: Daha fazla kayıt olup olmadığı

## Hata Yanıtları

### 401 - Kimlik Doğrulama Hatası
```json
{
  "success": false,
  "error": "Authentication required",
  "details": "Please provide a valid Spotify access token",
  "requestId": "uuid-request-id"
}
```

### 500 - Sunucu Hatası
```json
{
  "success": false,
  "error": "Failed to retrieve chat history",
  "details": "Database query failed",
  "requestId": "uuid-request-id"
}
```

### 503 - Servis Kullanılamaz
```json
{
  "success": false,
  "error": "Database service unavailable",
  "details": "Supabase connection failed",
  "requestId": "uuid-request-id"
}
```

## Özellikler

- ✅ Sayfalama desteği (20 kayıt/sayfa varsayılan)
- ✅ Spotify token ile kimlik doğrulama
- ✅ Circuit breaker pattern ile hata yönetimi
- ✅ Message preview'lar
- ✅ Performans optimizasyonu
- ✅ Comprehensive error handling
- ✅ Request tracking (requestId)
- ✅ Response time metrics

## Notlar

- Session'lar en son güncellenen tarihine göre sıralanır (yeniden eskiye)
- Preview mesajlar 100 karakter ile sınırlıdır
- Maximum sayfa boyutu 50'dir
- Total count yaklaşık değerdir (performans için)
- API rate limiting yoktur ama circuit breaker koruması vardır 