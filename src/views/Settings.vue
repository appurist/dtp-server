<template>
  <div>
    <v-row>
      <v-col cols="12">
        <h1 class="text-h4 mb-4">Settings</h1>
      </v-col>
    </v-row>

    <v-row>
      <v-col cols="12">
        <v-card>
          <!-- User Preferences (Connection settings managed server-side) -->
          <div class="pa-4">
            <UserPreferences />
          </div>
        </v-card>
      </v-col>
    </v-row>
  </div>
</template>

<script setup>
import UserPreferences from '@/components/UserPreferences.vue'

// Note: Connection settings are now managed server-side in connection.json
</script>
