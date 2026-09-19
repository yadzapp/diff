class CfgPatches
{
	class Marrow
	{
		units[] = {};
		weapons[] = {};
		requiredVersion = 0.1;
		requiredAddons[] = {"DZ_Data", "DZ_Scripts"};
	};
};

class CfgMods
{
	class Marrow
	{
		dir = "Marrow";
		name = "Marrow";
		author = "Holt";
		type = "mod";
		dependencies[] = {"Core", "Game", "World", "Mission"};
		class defs
		{
			class engineScriptModule
			{
				value = "";
				files[] = {"Marrow/scripts/1_Core"};
			};
			class gameLibScriptModule
			{
				value = "";
				files[] = {"Marrow/scripts/2_GameLib"};
			};
			class gameScriptModule
			{
				value = "";
				files[] = {"Marrow/scripts/3_Game"};
			};
			class worldScriptModule
			{
				value = "";
				files[] = {"Marrow/scripts/4_World"};
			};
			class missionScriptModule
			{
				value = "";
				files[] = {"Marrow/scripts/5_Mission"};
			};
		};
	};
};
