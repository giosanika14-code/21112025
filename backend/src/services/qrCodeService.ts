import QRCode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../config/database';

const QR_BASE_URL = process.env.QR_CODE_BASE_URL || 'http://localhost:3000/chat';

/**
 * QR Code Service for room identification
 */
export class QRCodeService {
  /**
   * Generate QR code for a room
   */
  static async generateRoomQRCode(
    hotelId: string,
    roomId: string,
    roomNumber: string
  ): Promise<{ qr_code: string; qr_code_url: string; qr_data_url: string }> {
    try {
      // Generate unique QR code identifier
      const qrCode = this.generateQRCodeIdentifier(hotelId, roomId);

      // Build URL that guests will access
      const qrUrl = `${QR_BASE_URL}?qr=${qrCode}`;

      // Generate QR code as data URL (base64 image)
      const qrDataUrl = await QRCode.toDataURL(qrUrl, {
        errorCorrectionLevel: 'M',
        type: 'image/png',
        width: 300,
        margin: 2,
        color: {
          dark: '#3F51B5', // Primary color from design system
          light: '#F0F2F5', // Background color
        },
      });

      return {
        qr_code: qrCode,
        qr_code_url: qrUrl,
        qr_data_url: qrDataUrl,
      };
    } catch (error) {
      console.error('Error generating QR code:', error);
      throw new Error('Failed to generate QR code');
    }
  }

  /**
   * Generate QR code identifier
   */
  private static generateQRCodeIdentifier(
    hotelId: string,
    roomId: string
  ): string {
    // Create a unique, URL-safe identifier
    const uniqueId = uuidv4();
    // Encode hotel and room information
    const encoded = Buffer.from(
      JSON.stringify({
        h: hotelId,
        r: roomId,
        t: Date.now(),
        u: uniqueId,
      })
    ).toString('base64url');

    return encoded;
  }

  /**
   * Decode QR code to get hotel and room information
   */
  static decodeQRCode(qrCode: string): {
    hotel_id: string;
    room_id: string;
    timestamp: number;
  } | null {
    try {
      const decoded = Buffer.from(qrCode, 'base64url').toString('utf-8');
      const data = JSON.parse(decoded);

      return {
        hotel_id: data.h,
        room_id: data.r,
        timestamp: data.t,
      };
    } catch (error) {
      console.error('Error decoding QR code:', error);
      return null;
    }
  }

  /**
   * Validate QR code and get room details
   */
  static async validateAndGetRoom(qrCode: string): Promise<{
    hotel_id: string;
    room_id: string;
    room_number: string;
    hotel_name: string;
  } | null> {
    try {
      // Decode QR code
      const decoded = this.decodeQRCode(qrCode);

      if (!decoded) {
        return null;
      }

      // Query room and hotel details
      const result = await query(
        `SELECT
          r.id as room_id,
          r.room_number,
          r.hotel_id,
          h.name as hotel_name,
          r.is_active as room_active,
          h.license_status
        FROM rooms r
        JOIN hotels h ON r.hotel_id = h.id
        WHERE r.id = $1 AND r.hotel_id = $2 AND r.qr_code = $3`,
        [decoded.room_id, decoded.hotel_id, qrCode]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const room = result.rows[0];

      // Check if room and hotel are active
      if (!room.room_active || room.license_status !== 'active') {
        return null;
      }

      return {
        hotel_id: room.hotel_id,
        room_id: room.room_id,
        room_number: room.room_number,
        hotel_name: room.hotel_name,
      };
    } catch (error) {
      console.error('Error validating QR code:', error);
      return null;
    }
  }

  /**
   * Regenerate QR code for a room (in case of security concerns)
   */
  static async regenerateRoomQRCode(
    hotelId: string,
    roomId: string
  ): Promise<{ qr_code: string; qr_code_url: string; qr_data_url: string }> {
    try {
      // Get room details
      const roomResult = await query(
        'SELECT room_number FROM rooms WHERE id = $1 AND hotel_id = $2',
        [roomId, hotelId]
      );

      if (roomResult.rows.length === 0) {
        throw new Error('Room not found');
      }

      const roomNumber = roomResult.rows[0].room_number;

      // Generate new QR code
      const qrData = await this.generateRoomQRCode(hotelId, roomId, roomNumber);

      // Update room with new QR code
      await query(
        `UPDATE rooms
         SET qr_code = $1, qr_code_url = $2, updated_at = CURRENT_TIMESTAMP
         WHERE id = $3 AND hotel_id = $4`,
        [qrData.qr_code, qrData.qr_data_url, roomId, hotelId]
      );

      return qrData;
    } catch (error) {
      console.error('Error regenerating QR code:', error);
      throw new Error('Failed to regenerate QR code');
    }
  }

  /**
   * Batch generate QR codes for multiple rooms
   */
  static async batchGenerateQRCodes(
    hotelId: string,
    roomIds: string[]
  ): Promise<
    Array<{
      room_id: string;
      room_number: string;
      qr_code: string;
      qr_data_url: string;
    }>
  > {
    const results = [];

    for (const roomId of roomIds) {
      try {
        const roomResult = await query(
          'SELECT room_number FROM rooms WHERE id = $1 AND hotel_id = $2',
          [roomId, hotelId]
        );

        if (roomResult.rows.length === 0) {
          continue;
        }

        const roomNumber = roomResult.rows[0].room_number;
        const qrData = await this.generateRoomQRCode(hotelId, roomId, roomNumber);

        // Update room with QR code
        await query(
          `UPDATE rooms
           SET qr_code = $1, qr_code_url = $2, updated_at = CURRENT_TIMESTAMP
           WHERE id = $3 AND hotel_id = $4`,
          [qrData.qr_code, qrData.qr_data_url, roomId, hotelId]
        );

        results.push({
          room_id: roomId,
          room_number: roomNumber,
          qr_code: qrData.qr_code,
          qr_data_url: qrData.qr_data_url,
        });
      } catch (error) {
        console.error(`Error generating QR code for room ${roomId}:`, error);
      }
    }

    return results;
  }

  /**
   * Generate printable QR code sheet for hotel
   */
  static async generatePrintableQRSheet(
    hotelId: string
  ): Promise<
    Array<{
      room_number: string;
      qr_data_url: string;
      hotel_name: string;
    }>
  > {
    try {
      const result = await query(
        `SELECT
          r.room_number,
          r.qr_code_url as qr_data_url,
          h.name as hotel_name
        FROM rooms r
        JOIN hotels h ON r.hotel_id = h.id
        WHERE r.hotel_id = $1 AND r.is_active = true
        ORDER BY r.room_number`,
        [hotelId]
      );

      return result.rows;
    } catch (error) {
      console.error('Error generating printable QR sheet:', error);
      throw new Error('Failed to generate printable QR sheet');
    }
  }
}
