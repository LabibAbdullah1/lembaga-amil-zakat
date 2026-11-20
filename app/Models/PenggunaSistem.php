<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class PenggunaSistem extends Authenticatable
{
    use Notifiable;

    protected $connection = 'mysql';

    protected $table = 'pengguna_sistem';

    public const PERAN_ADMIN = 'Admin';
    public const PERAN_AMIL_PENERIMA = 'Amil_Penerima';
    public const PERAN_VERIFIKATOR = 'Verifikator';
    public const PERAN_STAF_PENYALURAN = 'Staf_Penyaluran';
    public const PERAN_KETUA_DKM = 'Ketua_DKM';

    public const DAFTAR_PERAN = [
        self::PERAN_ADMIN,
        self::PERAN_AMIL_PENERIMA,
        self::PERAN_VERIFIKATOR,
        self::PERAN_STAF_PENYALURAN,
        self::PERAN_KETUA_DKM,
    ];

    protected $fillable = [
        'nama_lengkap',
        'username',
        'email',
        'no_hp',
        'password_hash',
        'peran',
        'status_aktif',
    ];

    protected $hidden = [
        'password_hash',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'status_aktif' => 'boolean',
        ];
    }

    public function getAuthPassword(): string
    {
        return (string) $this->password_hash;
    }

    public function getAuthPasswordName(): string
    {
        return 'password_hash';
    }

    public function isAktif(): bool
    {
        return (int) $this->getRawOriginal('status_aktif') === 1 || $this->status_aktif === true;
    }

    public function hasRole(string ...$roles): bool
    {
        return in_array($this->peran, $roles, true);
    }
}
