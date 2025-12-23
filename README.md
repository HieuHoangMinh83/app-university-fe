## Vouchers - APIs cho client

### 1. Lấy danh sách voucher của 1 client

- **Endpoint:** `GET /api/v1/vouchers/client/:clientId`
- **Mô tả:** Trả về danh sách voucher trong ví của client (bảng `ClientVoucher`), mỗi bản ghi gắn với 1 `voucher`.
- **Path params:**
  - `clientId`: ID của client
- **Authentication:** Tuỳ bạn triển khai, API hiện đang để `@Public()`, có thể sau này kiểm tra client theo token.

**Response (200 OK) ví dụ:**

```json
[
  {
    "id": "client-voucher-id-1",
    "clientId": "client-id-1",
    "voucherId": "voucher-id-1",
    "isActive": true,
    "isUsed": false,
    "usedAt": null,
    "createdAt": "2025-01-01T00:00:00.000Z",
    "voucher": {
      "id": "voucher-id-1",
      "name": "Giảm 20% tối đa 50k",
      "type": "PERCENT",
      "percent": 20,
      "maxPrice": 50000,
      "hasMaxPrice": true,
      "minApply": 100000,
      "isActive": true,
      "isRedeemable": true
    }
  }
]
```

- **Lưu ý:**
  - `id` của `ClientVoucher` là **tự gen** (`@default(uuid())`), client chỉ dùng để **truyền lại** khi tạo order (`clientVoucherId`).
  - `isUsed = true` và `usedAt != null` nghĩa là voucher này đã được dùng cho một order.

---

### 2. Lấy danh sách voucher có thể đổi (redeemable)

- **Endpoint:** `GET /api/v1/vouchers/redeemable/list`
- **Mô tả:** Trả về danh sách voucher có thể đổi bằng điểm:
  - `isRedeemable = true`
  - `isActive = true`
- **Authentication:** `@Public()` (có thể filter theo client sau).

**Response (200 OK) ví dụ:**

```json
[
  {
    "id": "voucher-id-1",
    "name": "Giảm 20% tối đa 50k",
    "type": "PERCENT",
    "percent": 20,
    "maxPrice": 50000,
    "hasMaxPrice": true,
    "minApply": 100000,
    "quantity": 100,
    "pointsRequired": 1000,
    "isRedeemable": true,
    "isActive": true,
    "createdAt": "2025-01-01T00:00:00.000Z",
    "updatedAt": "2025-01-01T00:00:00.000Z"
  }
]
```

- **Ý nghĩa một số field quan trọng:**
  - **`pointsRequired`**: Số điểm client cần để đổi voucher này.
  - **`isRedeemable`**: `true` thì có thể xuất hiện trong danh sách để client đổi; `false` thì không được đổi bằng điểm.
  - **`hasMaxPrice` + `maxPrice`**:
    - Nếu `hasMaxPrice = true` → giảm tối đa `maxPrice`.
    - Nếu `hasMaxPrice = false` → giảm vô hạn theo phần trăm.

---

### 3. Tóm tắt flow sử dụng

- **Đổi điểm → tạo ClientVoucher:**
  - Client chọn 1 voucher trong API `GET /api/v1/vouchers/redeemable/list`.
  - Backend kiểm tra điểm của client và `pointsRequired`, nếu đủ thì:
    - Trừ điểm client.
    - Tạo bản ghi `ClientVoucher` (id auto-gen).
- **Dùng voucher trong order:**
  - Client gửi `clientVoucherId` (id của `ClientVoucher`) khi tạo order.
  - Order service:
    - Check `ClientVoucher` thuộc đúng `client`, `isActive = true`, `isUsed = false`.
    - Áp dụng voucher (theo logic `FIXED` / `PERCENT` + `hasMaxPrice`).
    - Đánh dấu `ClientVoucher.isUsed = true`, `usedAt = now`.

